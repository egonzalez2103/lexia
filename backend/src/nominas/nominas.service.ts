import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe } from '../bitacora/cambios';
import { AuthUser } from '../common/auth';
import { money } from '../common/slug';
import { Colaborador } from '../entities/colaborador.entity';
import { MovimientoCaja } from '../entities/movimiento-caja.entity';
import { NominaPago } from '../entities/nomina-pago.entity';
import { NominaRecibo } from '../entities/nomina-recibo.entity';
import { NominaSemana } from '../entities/nomina-semana.entity';
import { ArchivoSemanaDto, CrearPagoNominaDto, ReciboNominaDto } from './dto';

const ELECTRONICOS = new Set(['Transferencia', 'Deposito', 'Tarjeta']);

@Injectable()
export class NominasService {
  constructor(
    @InjectRepository(NominaSemana) private readonly semanas: Repository<NominaSemana>,
    @InjectRepository(NominaPago) private readonly pagos: Repository<NominaPago>,
    @InjectRepository(NominaRecibo) private readonly recibos: Repository<NominaRecibo>,
    @InjectRepository(Colaborador) private readonly colaboradores: Repository<Colaborador>,
    private readonly bitacora: BitacoraService,
  ) {}

  async resumen(semanaInicio: string) {
    const semana = assertMonday(semanaInicio);
    const [personas, pagos, recibos, semanaRow] = await Promise.all([
      this.colaboradores.find({ order: { nombre: 'ASC' } }),
      this.pagos.find({ where: { semana_inicio: semana.inicio }, order: { id: 'DESC' } }),
      this.recibos.find({ where: { semana_inicio: semana.inicio } }),
      this.semanas.findOne({ where: { semana_inicio: semana.inicio } }),
    ]);
    const nombres = new Map(personas.map((person) => [person.id, nombreCompleto(person)]));
    const reciboDe = new Map(recibos.map((row) => [row.colaborador_id, row.archivo_url]));
    const pagosDe = new Map<number, NominaPago[]>();
    for (const pago of pagos) {
      const list = pagosDe.get(pago.colaborador_id) ?? [];
      list.push(pago);
      pagosDe.set(pago.colaborador_id, list);
    }
    const colaboradores = personas
      .filter((person) => entraEnSemana(person, semana.fin, pagosDe.has(person.id)))
      .map((person) => fila(person, pagosDe.get(person.id) ?? [], reciboDe.get(person.id) ?? null));
    const estimado = round2(colaboradores.reduce((total, row) => total + row.estimado, 0));
    const pagado = round2(colaboradores.reduce((total, row) => total + row.pagado, 0));
    const pagosElectronicos = pagos.filter((pago) => ELECTRONICOS.has(pago.forma_pago)).length;
    const firmados = colaboradores.filter((row) => row.recibo).length;
    const pendientesRecibo = colaboradores.filter((row) => row.pagado > 0 && !row.recibo).length;
    return {
      semana: {
        inicio: semana.inicio,
        fin: semana.fin,
        comprobante: semanaRow?.comprobante_url ?? null,
        pagos_electronicos: pagosElectronicos,
      },
      colaboradores,
      pagos: pagos.map((pago) => ({
        id: pago.id,
        colaborador_id: pago.colaborador_id,
        colaborador: nombres.get(pago.colaborador_id) ?? 'Persona dada de baja',
        forma_pago: pago.forma_pago,
        monto: money(pago.monto),
        descripcion: pago.descripcion,
        fecha: String(pago.fecha).slice(0, 10),
      })),
      resumen: {
        estimado,
        pagado,
        diferencia: round2(pagado - estimado),
        colaboradores: colaboradores.length,
        firmados,
        pendientes_recibo: pendientesRecibo,
        falta_comprobante: pagosElectronicos > 0 && !semanaRow?.comprobante_url,
      },
    };
  }

  async pagar(dto: CrearPagoNominaDto, actor: AuthUser) {
    const semana = assertMonday(dto.semana);
    const person = await this.colaboradores.findOne({ where: { id: dto.colaborador_id } });
    if (!person) throw new NotFoundException('No encontramos a ese colaborador.');
    const monto = round2(dto.monto);
    const fecha = hoy();
    let movimientoId: number | null = null;
    const pago = await this.pagos.manager.transaction(async (manager) => {
      if (dto.forma_pago === 'Efectivo') {
        const movimiento = await manager.save(
          MovimientoCaja,
          manager.create(MovimientoCaja, {
            caja: 'general',
            tipo: 'egreso',
            concepto: `Nómina de ${nombreCompleto(person)}`.slice(0, 180),
            monto: monto.toFixed(2),
            fecha,
          }),
        );
        movimientoId = movimiento.id;
      }
      return manager.save(
        NominaPago,
        manager.create(NominaPago, {
          semana_inicio: semana.inicio,
          colaborador_id: person.id,
          forma_pago: dto.forma_pago,
          monto: monto.toFixed(2),
          descripcion: dto.descripcion?.trim() || null,
          fecha,
        }),
      );
    });
    if (movimientoId) {
      await this.bitacora.registrar({
        despachoId: null,
        entidad: 'MovimientoCaja',
        entidadId: movimientoId,
        referencia: `Nómina de ${nombreCompleto(person)}`,
        tipo: 'alta',
        campos: altaDe({
          Caja: 'Caja general',
          Tipo: 'Egreso',
          Concepto: `Nómina de ${nombreCompleto(person)}`,
          Monto: pago.monto,
          Fecha: fecha,
        }),
        actor,
      });
    }
    await this.bitacora.registrar({
      despachoId: null,
      entidad: 'NominaPago',
      entidadId: pago.id,
      referencia: `Nómina de ${nombreCompleto(person)}`,
      tipo: 'alta',
      campos: altaDe({
        Colaborador: nombreCompleto(person),
        Semana: semana.inicio,
        'Forma de pago': pago.forma_pago,
        Monto: pago.monto,
        Descripción: pago.descripcion,
      }),
      actor,
    });
    return this.resumen(semana.inicio);
  }

  async comprobante(dto: ArchivoSemanaDto, actor: AuthUser) {
    const semana = assertMonday(dto.semana);
    assertArchivo(dto.archivo_url);
    const row = await this.semanas.findOne({ where: { semana_inicio: semana.inicio } });
    const antes = row?.comprobante_url ?? null;
    let savedId = row?.id;
    if (row) {
      row.comprobante_url = dto.archivo_url;
      await this.semanas.save(row);
      savedId = row.id;
    } else {
      const created = await this.semanas.save(
        this.semanas.create({
          semana_inicio: semana.inicio,
          semana_fin: semana.fin,
          comprobante_url: dto.archivo_url,
        }),
      );
      savedId = created.id;
    }
    if (savedId && antes !== dto.archivo_url) {
      await this.bitacora.registrar({
        despachoId: null,
        entidad: 'NominaComprobante',
        entidadId: savedId,
        referencia: `Comprobante ${semana.inicio}`,
        tipo: antes ? 'edicion' : 'alta',
        campos: antes
          ? { Comprobante: { anterior: 'Adjunto', nuevo: 'Reemplazado' } }
          : altaDe({ Semana: semana.inicio, Comprobante: 'Adjunto' }),
        actor,
      });
    }
    return this.resumen(semana.inicio);
  }

  async recibo(dto: ReciboNominaDto, actor: AuthUser) {
    const semana = assertMonday(dto.semana);
    assertArchivo(dto.archivo_url);
    const person = await this.colaboradores.findOne({ where: { id: dto.colaborador_id } });
    if (!person) throw new NotFoundException('No encontramos a ese colaborador.');
    const row = await this.recibos.findOne({
      where: { semana_inicio: semana.inicio, colaborador_id: person.id },
    });
    const antes = row?.archivo_url ?? null;
    const saved = row
      ? await this.recibos.save({ ...row, archivo_url: dto.archivo_url })
      : await this.recibos.save(
          this.recibos.create({
            semana_inicio: semana.inicio,
            colaborador_id: person.id,
            archivo_url: dto.archivo_url,
          }),
        );
    if (antes !== dto.archivo_url) {
      await this.bitacora.registrar({
        despachoId: null,
        entidad: 'NominaRecibo',
        entidadId: saved.id,
        referencia: `Recibo de ${nombreCompleto(person)}`,
        tipo: antes ? 'edicion' : 'alta',
        campos: antes
          ? { Recibo: { anterior: 'Adjunto', nuevo: 'Reemplazado' } }
          : altaDe({ Colaborador: nombreCompleto(person), Semana: semana.inicio, Recibo: 'Adjunto' }),
        actor,
      });
    }
    return this.resumen(semana.inicio);
  }
}

function entraEnSemana(person: Colaborador, fin: string, tienePagos: boolean) {
  if (tienePagos) return true;
  if (!person.activo || person.tiene_nomina === false) return false;
  return String(person.fecha_ingreso).slice(0, 10) <= fin;
}

function nombreCompleto(person: Colaborador) {
  return [person.nombre, person.paterno, person.materno].filter(Boolean).join(' ');
}

function cuentaEnNomina(person: Colaborador) {
  return person.activo && person.tiene_nomina !== false;
}

function fila(person: Colaborador, pagos: NominaPago[], recibo: string | null) {
  const sueldo = money(person.salario_semanal);
  const pagado = round2(pagos.reduce((total, pago) => total + money(pago.monto), 0));
  const pagadoEfectivo = round2(
    pagos.filter((pago) => pago.forma_pago === 'Efectivo').reduce((total, pago) => total + money(pago.monto), 0),
  );
  const pagadoTransferencia = round2(
    pagos.filter((pago) => pago.forma_pago === 'Transferencia').reduce((total, pago) => total + money(pago.monto), 0),
  );
  return {
    colaborador_id: person.id,
    colaborador: nombreCompleto(person),
    puesto: person.puesto,
    sueldo_semanal: sueldo,
    estimado: cuentaEnNomina(person) ? sueldo : 0,
    pagado,
    pagado_efectivo: pagadoEfectivo,
    pagado_transferencia: pagadoTransferencia,
    diferencia: round2(pagado - (cuentaEnNomina(person) ? sueldo : 0)),
    recibo,
  };
}

function assertMonday(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real || date.getUTCDay() !== 1) {
    throw new BadRequestException('Elige la semana completa, de lunes a domingo.');
  }
  const end = new Date(Date.UTC(year, month - 1, day + 6));
  const fin = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`;
  return { inicio: value, fin };
}

function assertArchivo(url: string) {
  if (!url.startsWith('/uploads/') || url.includes('..')) {
    throw new BadRequestException('El archivo no es válido.');
  }
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function hoy() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
