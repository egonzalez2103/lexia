import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe, diffCampos } from '../bitacora/cambios';
import { AlcanceService } from '../common/alcance.service';
import { AuthUser } from '../common/auth';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity';
import { TipoMovimientoDespacho } from '../entities/tipo-movimiento-despacho.entity';
import { TipoMovimientoUsuario } from '../entities/tipo-movimiento-usuario.entity';
import { User } from '../entities/user.entity';
import { ActualizarCuentaBancariaDto, ActualizarTipoMovimientoDto, CuentaBancariaDto, TipoMovimientoDto } from './dto';

@Injectable()
export class CatalogoMovimientosService {
  constructor(
    @InjectRepository(TipoMovimientoDespacho) private readonly tipos: Repository<TipoMovimientoDespacho>,
    @InjectRepository(TipoMovimientoUsuario) private readonly alcances: Repository<TipoMovimientoUsuario>,
    @InjectRepository(CuentaBancaria) private readonly cuentas: Repository<CuentaBancaria>,
    @InjectRepository(User) private readonly usuarios: Repository<User>,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  async listarTipos(user: AuthUser, despachoId?: number, q?: string, page = 1, pageSize = 50) {
    const despacho = await this.alcance.despachoDe(user, 'movimientos', despachoId);
    const gente = await this.genteDe(despacho.id);
    const todos = await this.tipos.find({ where: { despacho_id: despacho.id }, order: { nombre: 'ASC' } });
    const marcas = todos.length
      ? await this.alcances.find({ where: { tipo_id: In(todos.map((tipo) => tipo.id)) } })
      : [];
    const nombres = new Map(gente.map((persona) => [persona.id, persona.name]));
    const texto = q?.trim().toLocaleLowerCase('es-MX') ?? '';
    const filas = todos
      .map((tipo) => {
        const ids = marcas.filter((marca) => marca.tipo_id === tipo.id).map((marca) => marca.usuario_id);
        const quienes = ids.map((id) => nombres.get(id) ?? 'Usuario').sort((a, b) => a.localeCompare(b, 'es'));
        return {
          id: tipo.id,
          nombre: tipo.nombre,
          afecta_operacion: tipo.afecta_operacion,
          activo: tipo.activo,
          usuario_ids: ids,
          corresponde: corresponde(quienes),
        };
      })
      .filter((tipo) => !texto || tipo.nombre.toLocaleLowerCase('es-MX').includes(texto) || tipo.corresponde.toLocaleLowerCase('es-MX').includes(texto));
    return { ...pagina(filas, page, pageSize), usuarios: gente.map((persona) => ({ id: persona.id, name: persona.name })), es_admin: this.alcance.esAdmin(user) };
  }

  async crearTipo(user: AuthUser, dto: TipoMovimientoDto) {
    this.exigeAdmin(user);
    const despacho = await this.alcance.despachoDe(user, 'movimientos', dto.despacho_id, 'insertar');
    const nombre = nombreTipo(dto.nombre);
    await this.nombreLibre(despacho.id, nombre);
    const gente = await this.genteMarcada(despacho.id, dto.usuario_ids);
    const tipo = await this.tipos.save(this.tipos.create({ despacho_id: despacho.id, nombre, afecta_operacion: dto.afecta_operacion, activo: true }));
    await this.guardarAlcance(tipo.id, gente.map((persona) => persona.id));
    await this.bitacora.registrar({
      despachoId: despacho.id,
      entidad: 'TipoMovimiento',
      entidadId: tipo.id,
      referencia: tipo.nombre,
      tipo: 'alta',
      campos: altaDe({ Nombre: tipo.nombre, 'Afecta operación': tipo.afecta_operacion ? 'Sí' : 'No', Corresponde: corresponde(gente.map((persona) => persona.name)) }),
      actor: user,
    });
    return this.listarTipos(user, despacho.id);
  }

  async actualizarTipo(user: AuthUser, id: number, dto: ActualizarTipoMovimientoDto) {
    this.exigeAdmin(user);
    const despacho = await this.alcance.despachoDe(user, 'movimientos', dto.despacho_id, 'actualizar');
    const tipo = await this.buscarTipo(despacho.id, id);
    const antes = await this.fichaTipo(tipo);
    if (dto.nombre !== undefined) {
      const nombre = nombreTipo(dto.nombre);
      await this.nombreLibre(despacho.id, nombre, tipo.id);
      tipo.nombre = nombre;
    }
    if (dto.afecta_operacion !== undefined) tipo.afecta_operacion = dto.afecta_operacion;
    if (dto.activo !== undefined) tipo.activo = dto.activo;
    await this.tipos.save(tipo);
    if (dto.usuario_ids) {
      const gente = await this.genteMarcada(despacho.id, dto.usuario_ids);
      await this.alcances.delete({ tipo_id: tipo.id });
      await this.guardarAlcance(tipo.id, gente.map((persona) => persona.id));
    }
    const campos = diffCampos(antes, await this.fichaTipo(tipo));
    if (campos) {
      await this.bitacora.registrar({
        despachoId: despacho.id,
        entidad: 'TipoMovimiento',
        entidadId: tipo.id,
        referencia: tipo.nombre,
        tipo: 'edicion',
        campos,
        actor: user,
      });
    }
    return this.listarTipos(user, despacho.id);
  }

  async listarCuentas(user: AuthUser, despachoId?: number, q?: string, page = 1, pageSize = 50) {
    const despacho = await this.alcance.despachoDe(user, 'movimientos', despachoId);
    const rows = await this.cuentas.find({ where: { despacho_id: despacho.id }, order: { banco: 'ASC' } });
    const texto = q?.trim().toLocaleLowerCase('es-MX') ?? '';
    const filas = rows.filter((cuenta) => !texto || `${cuenta.banco} ${cuenta.numero} ${cuenta.clabe}`.toLocaleLowerCase('es-MX').includes(texto));
    return { ...pagina(filas, page, pageSize), es_admin: this.alcance.esAdmin(user) };
  }

  async crearCuenta(user: AuthUser, dto: CuentaBancariaDto) {
    this.exigeAdmin(user);
    const despacho = await this.alcance.despachoDe(user, 'movimientos', dto.despacho_id, 'insertar');
    const datos = cuentaDe(dto.banco, dto.numero, dto.clabe);
    await this.clabeLibre(despacho.id, datos.clabe);
    const cuenta = await this.cuentas.save(this.cuentas.create({ despacho_id: despacho.id, ...datos, activa: true }));
    await this.bitacora.registrar({
      despachoId: despacho.id,
      entidad: 'CuentaBancaria',
      entidadId: cuenta.id,
      referencia: cuenta.banco,
      tipo: 'alta',
      campos: altaDe({ Banco: cuenta.banco, Cuenta: cuenta.numero, CLABE: cuenta.clabe }),
      actor: user,
    });
    return this.listarCuentas(user, despacho.id);
  }

  async actualizarCuenta(user: AuthUser, id: number, dto: ActualizarCuentaBancariaDto) {
    this.exigeAdmin(user);
    const despacho = await this.alcance.despachoDe(user, 'movimientos', dto.despacho_id, 'actualizar');
    const cuenta = await this.buscarCuenta(despacho.id, id);
    const antes = fichaCuenta(cuenta);
    const banco = dto.banco !== undefined ? nombreBanco(dto.banco) : cuenta.banco;
    const numero = dto.numero !== undefined ? digitos(dto.numero, 'número de cuenta', 4, 20) : cuenta.numero;
    const clabe = dto.clabe !== undefined ? digitos(dto.clabe, 'CLABE', 18, 18) : cuenta.clabe;
    if (clabe !== cuenta.clabe) await this.clabeLibre(despacho.id, clabe, cuenta.id);
    cuenta.banco = banco;
    cuenta.numero = numero;
    cuenta.clabe = clabe;
    if (dto.activa !== undefined) cuenta.activa = dto.activa;
    await this.cuentas.save(cuenta);
    const campos = diffCampos(antes, fichaCuenta(cuenta));
    if (campos) {
      await this.bitacora.registrar({
        despachoId: despacho.id,
        entidad: 'CuentaBancaria',
        entidadId: cuenta.id,
        referencia: cuenta.banco,
        tipo: 'edicion',
        campos,
        actor: user,
      });
    }
    return this.listarCuentas(user, despacho.id);
  }

  private exigeAdmin(user: AuthUser) {
    if (!this.alcance.esAdmin(user)) throw new ForbiddenException('El catálogo de movimientos lo opera la administración del despacho.');
  }

  private async genteDe(despachoId: number) {
    return this.usuarios.find({ where: { despacho_id: despachoId, activo: true }, order: { name: 'ASC' } });
  }

  private async genteMarcada(despachoId: number, ids: number[]) {
    const unicos = [...new Set(ids)];
    if (!unicos.length) return [];
    const gente = await this.usuarios.find({ where: { despacho_id: despachoId, activo: true, id: In(unicos) } });
    if (gente.length !== unicos.length) throw new BadRequestException('Alguna persona marcada no pertenece al despacho.');
    return gente;
  }

  private async guardarAlcance(tipoId: number, usuarioIds: number[]) {
    if (!usuarioIds.length) return;
    await this.alcances.save(usuarioIds.map((usuarioId) => this.alcances.create({ tipo_id: tipoId, usuario_id: usuarioId })));
  }

  private async buscarTipo(despachoId: number, id: number) {
    const tipo = await this.tipos.findOne({ where: { id, despacho_id: despachoId } });
    if (!tipo) throw new NotFoundException('No encontramos ese tipo de movimiento.');
    return tipo;
  }

  private async buscarCuenta(despachoId: number, id: number) {
    const cuenta = await this.cuentas.findOne({ where: { id, despacho_id: despachoId } });
    if (!cuenta) throw new NotFoundException('No encontramos esa cuenta bancaria.');
    return cuenta;
  }

  private async nombreLibre(despachoId: number, nombre: string, excepto?: number) {
    const clave = sinAcento(nombre);
    const existentes = await this.tipos.find({ where: { despacho_id: despachoId } });
    if (existentes.some((tipo) => tipo.id !== excepto && sinAcento(tipo.nombre) === clave)) {
      throw new ConflictException('Ese tipo de movimiento ya existe en el despacho.');
    }
  }

  private async clabeLibre(despachoId: number, clabe: string, excepto?: number) {
    const tomada = await this.cuentas.findOne({ where: { despacho_id: despachoId, clabe } });
    if (tomada && tomada.id !== excepto) throw new ConflictException('Esa CLABE ya está registrada en el despacho.');
  }

  private async fichaTipo(tipo: TipoMovimientoDespacho) {
    const marcas = await this.alcances.find({ where: { tipo_id: tipo.id } });
    const gente = marcas.length ? await this.usuarios.find({ where: { id: In(marcas.map((marca) => marca.usuario_id)) } }) : [];
    return {
      Nombre: tipo.nombre,
      'Afecta operación': tipo.afecta_operacion ? 'Sí' : 'No',
      Estado: tipo.activo ? 'Activo' : 'Inhabilitado',
      Corresponde: corresponde(gente.map((persona) => persona.name).sort((a, b) => a.localeCompare(b, 'es'))),
    };
  }
}

function pagina<T>(filas: T[], page: number, pageSize: number) {
  const tamano = Math.min(200, Math.max(1, pageSize || 50));
  const actual = Math.max(1, page || 1);
  const total = filas.length;
  const inicio = (actual - 1) * tamano;
  return { data: filas.slice(inicio, inicio + tamano), total, page: actual, pageSize: tamano, totalPages: Math.max(1, Math.ceil(total / tamano)) };
}

function corresponde(nombres: string[]) {
  if (!nombres.length) return 'Sin limitar';
  if (nombres.length <= 2) return nombres.join(', ');
  return `${nombres.slice(0, 2).join(', ')} y ${nombres.length - 2} más`;
}

function nombreTipo(raw: string) {
  const limpio = raw.replace(/[^\p{L}\p{M}\s]/gu, '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('es-MX');
  if (limpio.length < 2) throw new BadRequestException('El nombre solo admite letras y debe tener al menos 2.');
  return limpio.slice(0, 180);
}

function nombreBanco(raw: string) {
  const limpio = raw.replace(/[^\p{L}\p{M}\s]/gu, '').replace(/\s+/g, ' ').trim();
  if (limpio.length < 2) throw new BadRequestException('El banco solo admite letras y debe tener al menos 2.');
  return limpio.slice(0, 120);
}

function digitos(raw: string, nombre: string, min: number, max: number) {
  const valor = raw.replace(/\D/g, '');
  if (valor.length < min || valor.length > max) {
    throw new BadRequestException(min === max ? `La ${nombre} debe tener ${min} dígitos.` : `El ${nombre} debe tener entre ${min} y ${max} dígitos.`);
  }
  return valor;
}

function cuentaDe(banco: string, numero: string, clabe: string) {
  return { banco: nombreBanco(banco), numero: digitos(numero, 'número de cuenta', 4, 20), clabe: digitos(clabe, 'CLABE', 18, 18) };
}

function fichaCuenta(cuenta: CuentaBancaria) {
  return { Banco: cuenta.banco, Cuenta: cuenta.numero, CLABE: cuenta.clabe, Estado: cuenta.activa ? 'Activa' : 'Inactiva' };
}

function sinAcento(valor: string) {
  return valor.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleUpperCase('es-MX');
}
