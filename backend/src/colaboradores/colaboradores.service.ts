import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { EntityManager, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe, diffCampos } from '../bitacora/cambios';
import { AuthUser } from '../common/auth';
import { CampoEdicion } from '../entities/bitacora-edicion.entity';
import { UserRole } from '../common/enums';
import { money } from '../common/slug';
import { baseNombreUsuario, siguienteNombreUsuario } from '../common/usuario';
import { CorteDespacho } from '../entities/corte-despacho.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { tieneCajaAbierta } from '../movimientos/saldos';
import { Colaborador } from '../entities/colaborador.entity';
import { Grupo } from '../entities/grupo.entity';
import { TipoColaborador } from '../entities/tipo-colaborador.entity';
import { User } from '../entities/user.entity';
import { TiposColaboradorService } from '../tipos-colaborador/tipos-colaborador.service';
import { AccesoColaboradorDto, CreateColaboradorDto, UpdateColaboradorDto } from './dto';

@Injectable()
export class ColaboradoresService {
  constructor(
    @InjectRepository(Colaborador) private readonly rows: Repository<Colaborador>,
    @InjectRepository(TipoColaborador) private readonly tipos: Repository<TipoColaborador>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Grupo) private readonly grupos: Repository<Grupo>,
    private readonly catalogo: TiposColaboradorService,
    private readonly bitacora: BitacoraService,
  ) {}

  async list() {
    await this.catalogo.list();
    const [rows, tipos, users] = await Promise.all([
      this.rows.find({ order: { nombre: 'ASC' } }),
      this.tipos.find(),
      this.users.find(),
    ]);
    const tipoDe = new Map(tipos.map((tipo) => [tipo.id, tipo]));
    const userDe = new Map(users.map((user) => [user.id, user]));
    return rows.map((row) => this.present(row, tipoDe.get(row.tipo_id ?? 0) ?? null, row.usuario_id ? userDe.get(row.usuario_id) ?? null : null));
  }

  async create(dto: CreateColaboradorDto, actor: AuthUser) {
    const tipo = await this.tipos.findOne({ where: { id: dto.tipo_id } });
    if (!tipo) throw new BadRequestException('Elige un tipo de colaborador.');
    this.validarAcceso(dto.acceso, true);
    const grupoId = await this.resolverGrupo(tipo, dto.acceso);
    const saved = await this.rows.manager.transaction(async (manager) => {
      const row = await manager.save(
        Colaborador,
        manager.create(Colaborador, {
          nombre: mayusculas(dto.nombre) || dto.nombre.trim(),
          paterno: mayusculas(dto.paterno) || dto.paterno.trim(),
          materno: mayusculas(dto.materno),
          puesto: tipo.descripcion,
          tipo_id: tipo.id,
          correo: (dto.acceso?.tiene_acceso ? dto.acceso.correo : dto.correo)?.trim().toLowerCase() || null,
          telefono: telefonoDe(dto.acceso?.telefono),
          fecha_ingreso: hoy(),
          salario_semanal: dto.salario_semanal.toFixed(2),
          tiene_nomina: dto.tiene_nomina ?? true,
          activo: true,
        }),
      );
      if (dto.acceso?.tiene_acceso) {
        const user = await this.crearUsuario(manager, row, dto.acceso, grupoId!);
        row.usuario_id = user.id;
        await manager.save(row);
        return { row, user };
      }
      return { row, user: null as User | null };
    });
    await this.bitacora.registrar({
      despachoId: null,
      entidad: 'Colaborador',
      entidadId: saved.row.id,
      referencia: nombreCompleto(saved.row),
      tipo: 'alta',
      campos: altaDe(fichaColaborador(saved.row, saved.user)),
      actor,
    });
    return this.present(saved.row, tipo, saved.user);
  }

  async update(id: number, dto: UpdateColaboradorDto, actor: AuthUser) {
    const row = await this.rows.findOne({ where: { id } });
    if (!row) throw new NotFoundException('No encontramos a esa persona.');
    const userAntes = row.usuario_id ? await this.users.findOne({ where: { id: row.usuario_id } }) : null;
    const antes = fichaColaborador(row, userAntes);
    const cambiaClave = Boolean(dto.acceso?.password?.trim() && row.usuario_id);
    if (dto.nombre) row.nombre = mayusculas(dto.nombre) ?? row.nombre;
    if (dto.paterno !== undefined) row.paterno = mayusculas(dto.paterno);
    if (dto.materno !== undefined) row.materno = mayusculas(dto.materno);
    if (dto.salario_semanal !== undefined) row.salario_semanal = dto.salario_semanal.toFixed(2);
    if (dto.tiene_nomina !== undefined) row.tiene_nomina = dto.tiene_nomina;
    if (dto.activo !== undefined) row.activo = dto.activo;
    if (dto.correo !== undefined && !dto.acceso?.tiene_acceso) row.correo = dto.correo.trim().toLowerCase() || null;
    let tipo = row.tipo_id ? await this.tipos.findOne({ where: { id: row.tipo_id } }) : null;
    if (dto.tipo_id) {
      tipo = await this.tipos.findOne({ where: { id: dto.tipo_id } });
      if (!tipo) throw new BadRequestException('Elige un tipo de colaborador.');
      row.tipo_id = tipo.id;
      row.puesto = tipo.descripcion;
    }
    const alta = dto.acceso?.tiene_acceso === true && !row.usuario_id;
    this.validarAcceso(dto.acceso, alta);
    const grupoId = tipo ? await this.resolverGrupo(tipo, dto.acceso) : null;
    const user = await this.rows.manager.transaction(async (manager) => {
      await manager.save(row);
      return this.sincronizarAcceso(manager, row, dto.acceso, grupoId);
    });
    const campos: Record<string, CampoEdicion> = diffCampos(antes, fichaColaborador(row, user)) ?? {};
    if (cambiaClave) campos['Contraseña'] = { anterior: null, nuevo: 'Actualizada' };
    if (Object.keys(campos).length) {
      await this.bitacora.registrar({
        despachoId: null,
        entidad: 'Colaborador',
        entidadId: row.id,
        referencia: nombreCompleto(row),
        tipo: 'edicion',
        campos,
        actor,
      });
    }
    return this.present(row, tipo, user);
  }

  private validarAcceso(acceso: AccesoColaboradorDto | undefined, alta: boolean) {
    if (!acceso?.tiene_acceso) return;
    if (!acceso.correo?.trim()) throw new BadRequestException('El correo es obligatorio para dar acceso al sistema.');
    if (alta && !acceso.password?.trim()) {
      throw new BadRequestException('La contraseña es obligatoria para dar acceso al sistema.');
    }
    telefonoDe(acceso.telefono);
  }

  private async resolverGrupo(tipo: TipoColaborador, acceso?: AccesoColaboradorDto) {
    if (!acceso?.tiene_acceso) return tipo.grupo_id;
    const elegido = Number(acceso.grupo_id || tipo.grupo_id || 0);
    if (!elegido) throw new BadRequestException('Selecciona el grupo del usuario.');
    if (tipo.grupo_id && tipo.grupo_id !== elegido) {
      const grupoPuesto = await this.grupos.findOne({ where: { id: tipo.grupo_id } });
      throw new BadRequestException(`El grupo del usuario debe ser el mismo que el puesto (${grupoPuesto?.nombre ?? 'del puesto'}).`);
    }
    const dueno = await this.tipos.findOne({ where: { grupo_id: elegido } });
    if (dueno && dueno.id !== tipo.id) {
      throw new BadRequestException(`El grupo seleccionado corresponde al puesto ${dueno.descripcion}. Elige ese puesto.`);
    }
    const grupo = await this.grupos.findOne({ where: { id: elegido } });
    if (!grupo) throw new NotFoundException('No encontramos ese grupo.');
    if (!tipo.grupo_id) {
      tipo.grupo_id = elegido;
      await this.tipos.save(tipo);
    }
    return elegido;
  }

  private async sincronizarAcceso(manager: EntityManager, row: Colaborador, acceso: AccesoColaboradorDto | undefined, grupoId: number | null) {
    if (!acceso) return row.usuario_id ? manager.findOne(User, { where: { id: row.usuario_id } }) : null;
    if (!acceso.tiene_acceso) {
      if (!row.usuario_id) return null;
      const user = await manager.findOne(User, { where: { id: row.usuario_id } });
      if (user) {
        await this.assertSinCaja(manager, user);
        user.activo = false;
        await manager.save(user);
      }
      return user;
    }
    if (acceso.telefono !== undefined) row.telefono = telefonoDe(acceso.telefono);
    if (!row.usuario_id) {
      const user = await this.crearUsuario(manager, row, acceso, grupoId!);
      row.usuario_id = user.id;
      row.correo = acceso.correo!.trim().toLowerCase();
      await manager.save(row);
      return user;
    }
    const user = await manager.findOne(User, { where: { id: row.usuario_id } });
    if (!user) throw new NotFoundException('No encontramos el usuario de este colaborador.');
    const email = acceso.correo!.trim().toLowerCase();
    const tomado = await manager.findOne(User, { where: { email } });
    if (tomado && tomado.id !== user.id) throw new ConflictException('Ese correo ya tiene cuenta.');
    user.email = email;
    user.name = [row.nombre, row.paterno, row.materno].filter(Boolean).join(' ');
    if (acceso.activo === false) await this.assertSinCaja(manager, user);
    user.activo = acceso.activo !== false;
    if (grupoId) user.grupo_id = grupoId;
    if (acceso.password?.trim()) user.password = await bcrypt.hash(acceso.password, 10);
    row.correo = email;
    await manager.save(user);
    await manager.save(row);
    return user;
  }

  private async assertSinCaja(manager: EntityManager, user: User) {
    if (!user.despacho_id) return;
    const [movs, cortes] = await Promise.all([
      manager.find(MovimientoDespacho, { where: { despacho_id: user.despacho_id } }),
      manager.find(CorteDespacho, { where: { despacho_id: user.despacho_id, usuario_id: user.id } }),
    ]);
    const hasta = cortes.reduce((max, corte) => Math.max(max, corte.hasta_movimiento_id), 0);
    if (tieneCajaAbierta(movs, user.id, hasta)) {
      throw new BadRequestException('Esta persona tiene efectivo sin corte en su despacho. Haz el corte antes de quitar el acceso.');
    }
  }

  private async crearUsuario(manager: EntityManager, row: Colaborador, acceso: AccesoColaboradorDto, grupoId: number) {
    const email = acceso.correo!.trim().toLowerCase();
    const tomado = await manager.findOne(User, { where: { email } });
    if (tomado) throw new ConflictException('Ese correo ya tiene cuenta.');
    const base = baseNombreUsuario(row.nombre, row.paterno);
    if (!base) throw new BadRequestException('No se pudo armar el usuario con el nombre y el apellido.');
    const existentes = await manager.find(User);
    const ocupados = new Set(existentes.map((user) => user.username).filter((value): value is string => Boolean(value)));
    const username = siguienteNombreUsuario(base, ocupados);
    return manager.save(
      User,
      manager.create(User, {
        name: [row.nombre, row.paterno, row.materno].filter(Boolean).join(' '),
        email,
        username,
        password: await bcrypt.hash(acceso.password ?? '', 10),
        role: UserRole.PERSONAL,
        despacho_id: null,
        grupo_id: grupoId,
        activo: true,
      }),
    );
  }

  private present(row: Colaborador, tipo: TipoColaborador | null, user: User | null) {
    return {
      ...row,
      salario_semanal: money(row.salario_semanal),
      puesto: tipo?.descripcion ?? row.puesto,
      usuario: user
        ? { id: user.id, username: user.username, email: user.email, activo: user.activo !== false }
        : null,
    };
  }
}

function fichaColaborador(row: Colaborador, user: User | null) {
  return {
    Nombre: row.nombre,
    'Apellido paterno': row.paterno,
    'Apellido materno': row.materno,
    Puesto: row.puesto,
    Correo: row.correo,
    Teléfono: row.telefono,
    'Salario semanal': row.salario_semanal,
    Nómina: row.tiene_nomina ? 'Sí' : 'No',
    Activo: row.activo ? 'Sí' : 'No',
    Acceso: user && user.activo !== false ? user.username || user.email : 'Sin acceso',
  };
}

function nombreCompleto(row: Pick<Colaborador, 'nombre' | 'paterno' | 'materno'>) {
  return [row.nombre, row.paterno, row.materno].filter(Boolean).join(' ');
}

function hoy() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function mayusculas(value?: string | null) {
  const text = value?.trim();
  return text ? text.toLocaleUpperCase('es-MX') : null;
}

function telefonoDe(value?: string | null) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length !== 10) throw new BadRequestException('El teléfono debe tener 10 dígitos.');
  return digits;
}
