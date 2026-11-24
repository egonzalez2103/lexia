import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe, diffCampos } from '../bitacora/cambios';
import { AlcanceService } from '../common/alcance.service';
import { AuthUser } from '../common/auth';
import { money } from '../common/slug';
import { Cliente } from '../entities/cliente.entity';
import { MovimientoDespacho } from '../entities/movimiento-despacho.entity';
import { ClienteDto } from './dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(MovimientoDespacho) private readonly movimientos: Repository<MovimientoDespacho>,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  async list(user: AuthUser, despachoId?: number, q?: string) {
    const despacho = await this.alcance.despachoDe(user, 'clientes', despachoId);
    const rows = await this.clientes.find({ where: { despacho_id: despacho.id }, order: { nombre: 'ASC' } });
    const texto = q?.trim().toLocaleLowerCase('es-MX') ?? '';
    return rows
      .filter((row) => !texto || nombre(row).toLocaleLowerCase('es-MX').includes(texto) || (row.rfc ?? '').toLowerCase().includes(texto))
      .map((row) => this.presentar(row));
  }

  async one(user: AuthUser, id: number, despachoId?: number) {
    const despacho = await this.alcance.despachoDe(user, 'clientes', despachoId);
    const cliente = await this.buscar(despacho.id, id);
    const pagos = await this.movimientos.find({
      where: { despacho_id: despacho.id, cliente_id: cliente.id, tipo: 'ingreso', estado: 'aplicado' },
      order: { id: 'DESC' },
    });
    return {
      ...this.presentar(cliente),
      pagos: pagos.map((pago) => ({
        id: pago.id,
        concepto: pago.concepto,
        monto: money(pago.monto),
        fecha: String(pago.fecha).slice(0, 10),
      })),
    };
  }

  async create(user: AuthUser, dto: ClienteDto) {
    const despacho = await this.alcance.despachoDe(user, 'clientes', dto.despacho_id, 'insertar');
    const row = this.clientes.create({ despacho_id: despacho.id, activo: dto.activo ?? true, tipo: 'fisica', nombre: '' });
    this.aplicar(dto, row, true);
    const saved = await this.clientes.manager.transaction(async (manager) => {
      const guardado = await manager.save(row);
      await this.bitacora.registrar(
        {
          despachoId: despacho.id,
          entidad: 'Cliente',
          entidadId: guardado.id,
          referencia: nombre(guardado),
          tipo: 'alta',
          campos: altaDe(ficha(guardado)),
          actor: user,
        },
        manager,
      );
      return guardado;
    });
    return this.presentar(saved);
  }

  async update(user: AuthUser, id: number, dto: ClienteDto) {
    const despacho = await this.alcance.despachoDe(user, 'clientes', dto.despacho_id, 'actualizar');
    const saved = await this.clientes.manager.transaction(async (manager) => {
      const row = await manager.findOne(Cliente, { where: { id, despacho_id: despacho.id } });
      if (!row) throw new NotFoundException('No encontramos ese cliente.');
      const antes = ficha(row);
      this.aplicar(dto, row, false);
      const guardado = await manager.save(row);
      const campos = diffCampos(antes, ficha(guardado));
      if (campos) {
        await this.bitacora.registrar(
          {
            despachoId: despacho.id,
            entidad: 'Cliente',
            entidadId: guardado.id,
            referencia: nombre(guardado),
            tipo: 'edicion',
            campos,
            actor: user,
          },
          manager,
        );
      }
      return guardado;
    });
    return this.presentar(saved);
  }

  private aplicar(dto: ClienteDto, row: Cliente, alta: boolean) {
    const tipo = dto.tipo ?? row.tipo ?? 'fisica';
    if (alta || dto.tipo !== undefined) row.tipo = tipo;
    if (alta || dto.nombre !== undefined) row.nombre = dto.nombre.trim();
    if (tipo === 'moral') {
      row.paterno = null;
      row.materno = null;
    } else if (alta || dto.paterno !== undefined) {
      const paterno = dto.paterno?.trim() || '';
      if (!paterno) throw new BadRequestException('El apellido paterno es obligatorio.');
      row.paterno = paterno;
      if (dto.materno !== undefined) row.materno = dto.materno?.trim() || null;
    } else if (!row.paterno?.trim()) {
      throw new BadRequestException('El apellido paterno es obligatorio.');
    } else if (dto.materno !== undefined) {
      row.materno = dto.materno?.trim() || null;
    }
    if (dto.rfc !== undefined) row.rfc = dto.rfc?.trim().toUpperCase() || null;
    if (dto.domicilio !== undefined) row.domicilio = dto.domicilio?.trim() || null;
    if (dto.telefono !== undefined) row.telefono = telefonoDe(dto.telefono);
    if (dto.correo !== undefined) row.correo = dto.correo?.trim().toLowerCase() || null;
    if (dto.notas !== undefined) row.notas = dto.notas?.trim() || null;
    if (dto.activo !== undefined) row.activo = dto.activo;
  }

  private async buscar(despachoId: number, id: number) {
    const row = await this.clientes.findOne({ where: { id, despacho_id: despachoId } });
    if (!row) throw new NotFoundException('No encontramos ese cliente.');
    return row;
  }

  private presentar(row: Cliente) {
    return { ...row, nombre_completo: nombre(row) };
  }
}

function nombre(row: Pick<Cliente, 'nombre' | 'paterno' | 'materno'>) {
  return [row.nombre, row.paterno, row.materno].filter(Boolean).join(' ');
}

function ficha(row: Cliente) {
  return {
    Tipo: row.tipo === 'moral' ? 'Persona moral' : 'Persona física',
    Nombre: nombre(row),
    RFC: row.rfc,
    Domicilio: row.domicilio,
    Teléfono: row.telefono,
    Correo: row.correo,
    Notas: row.notas,
    Activo: row.activo ? 'Sí' : 'No',
  };
}

function telefonoDe(value?: string | null) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length !== 10) throw new BadRequestException('El teléfono debe tener 10 dígitos.');
  return digits;
}
