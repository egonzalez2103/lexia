import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums';
import { Asunto } from '../entities/asunto.entity';
import { Audiencia } from '../entities/audiencia.entity';
import { Autoridad } from '../entities/autoridad.entity';
import { Cargo } from '../entities/cargo.entity';
import { CatalogoJuridico } from '../entities/catalogo-juridico.entity';
import { Cliente } from '../entities/cliente.entity';
import { Deposito } from '../entities/deposito.entity';
import { Despacho } from '../entities/despacho.entity';
import { DocumentoExpediente } from '../entities/documento-expediente.entity';
import { Expediente } from '../entities/expediente.entity';
import { Parte } from '../entities/parte.entity';
import { Promocion } from '../entities/promocion.entity';
import { Termino } from '../entities/termino.entity';
import { User } from '../entities/user.entity';

export const DEMO_SLUG = 'campos-prueba';
export const DEMO_EMAIL = 'sede.tepic@lexia.local';
export const DEMO_PASSWORD = 'prueba-lexia';

@Injectable()
export class DemoSedeSeed implements OnModuleInit {
  private readonly logger = new Logger(DemoSedeSeed.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Despacho) private readonly despachos: Repository<Despacho>,
    @InjectRepository(User) private readonly usuarios: Repository<User>,
    @InjectRepository(CatalogoJuridico) private readonly catalogos: Repository<CatalogoJuridico>,
    @InjectRepository(Autoridad) private readonly autoridades: Repository<Autoridad>,
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(Asunto) private readonly asuntos: Repository<Asunto>,
    @InjectRepository(Expediente) private readonly expedientes: Repository<Expediente>,
    @InjectRepository(Parte) private readonly partes: Repository<Parte>,
    @InjectRepository(Termino) private readonly terminos: Repository<Termino>,
    @InjectRepository(Promocion) private readonly promociones: Repository<Promocion>,
    @InjectRepository(Audiencia) private readonly audiencias: Repository<Audiencia>,
    @InjectRepository(DocumentoExpediente) private readonly documentos: Repository<DocumentoExpediente>,
    @InjectRepository(Cargo) private readonly cargos: Repository<Cargo>,
    @InjectRepository(Deposito) private readonly depositos: Repository<Deposito>,
  ) {}

  async onModuleInit() {
    if (!demoActivo(this.config)) return;
    const existe = await this.despachos.findOne({ where: { slug: DEMO_SLUG } });
    if (existe) return;
    await this.crear();
    this.logger.log(`Sede de prueba lista: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  }

  private async crear() {
    const password = await bcrypt.hash(DEMO_PASSWORD, 10);
    const despacho = await this.despachos.save(
      this.despachos.create({
        name: 'Campos Prueba',
        slug: DEMO_SLUG,
        phone: '3110000000',
        address: 'Tepic, Nayarit',
        blurb: 'Despacho de prueba con la sede Tepic.',
        is_active: true,
      }),
    );
    const admin = await this.usuarios.save(
      this.usuarios.create({
        name: 'Ana Prueba',
        email: DEMO_EMAIL,
        password,
        role: UserRole.ADMIN_DESPACHO,
        despacho_id: despacho.id,
        activo: true,
        funcion: null,
        sede_id: null,
      }),
    );
    const catalogo = async (tipo: CatalogoJuridico['tipo'], nombre: string, detalle?: string, telefono?: string) =>
      this.catalogos.save(this.catalogos.create({ despacho_id: despacho.id, tipo, nombre, detalle: detalle ?? null, telefono: telefono ?? null }));
    const materia = await catalogo('materia', 'Familiar');
    const jurisdiccion = await catalogo('jurisdiccion', 'Tepic', 'Nayarit');
    const instancia = await catalogo('instancia', 'Primera');
    const estatus = await catalogo('estatus', 'En trámite');
    const sede = await catalogo('sede', 'Tepic', 'Centro, Tepic', '3110000000');
    const autoridad = await this.autoridades.save(
      this.autoridades.create({
        despacho_id: despacho.id,
        nombre: 'Juzgado primero familiar de Tepic',
        materia_id: materia.id,
        instancia_id: instancia.id,
      }),
    );
    await this.usuarios.save(
      this.usuarios.create({
        name: 'Luis Caja',
        email: 'caja.tepic@lexia.local',
        password,
        role: UserRole.MIEMBRO_DESPACHO,
        despacho_id: despacho.id,
        activo: true,
        funcion: 'caja',
        sede_id: sede.id,
      }),
    );
    const cliente = await this.clientes.save(
      this.clientes.create({
        despacho_id: despacho.id,
        tipo: 'fisica',
        nombre: 'María',
        paterno: 'López',
        materno: 'Hernández',
        domicilio: 'Calle Zaragoza 10, Tepic',
        telefono: '3111111111',
        correo: 'maria.lopez@example.com',
        autor_id: admin.id,
        activo: true,
      }),
    );
    const asunto = await this.asuntos.save(
      this.asuntos.create({
        despacho_id: despacho.id,
        cliente_id: cliente.id,
        titulo: 'Divorcio voluntario',
        notas: 'Asunto de prueba de la sede Tepic.',
        esquema: 'Tres exhibiciones: 50% al inicio, 25% en pruebas y 25% en sentencia',
        monto_acordado: '30000.00',
      }),
    );
    const expediente = await this.expedientes.save(
      this.expedientes.create({
        despacho_id: despacho.id,
        titulo: 'Divorcio voluntario López',
        cliente: 'María López Hernández',
        cliente_id: cliente.id,
        asunto_id: asunto.id,
        numero: '124',
        anio: new Date().getFullYear(),
        autoridad_id: autoridad.id,
        sede_id: sede.id,
        jurisdiccion_id: jurisdiccion.id,
        materia_id: materia.id,
        instancia_id: instancia.id,
        estatus_id: estatus.id,
        etapa: 'Audiencia inicial',
        juzgado: autoridad.nombre,
        materia: materia.nombre,
        folio: null,
      }),
    );
    expediente.folio = `${new Date().getFullYear()}-${String(expediente.id).padStart(6, '0')}`;
    await this.expedientes.save(expediente);
    await this.partes.save(this.partes.create({ expediente_id: expediente.id, nombre: 'María López Hernández', caracter: 'Actora' }));
    await this.terminos.save(
      this.terminos.create({
        expediente_id: expediente.id,
        titulo: 'Contestación de demanda',
        vence_el: fecha(5),
        estado: 'pendiente',
        notas: 'Término de prueba. La fecha es manual.',
      }),
    );
    await this.promociones.save(
      this.promociones.create({
        expediente_id: expediente.id,
        titulo: 'Escrito inicial',
        juzgado: autoridad.nombre,
        presentada_el: fecha(0),
        notas: 'Promoción de prueba.',
        archivo_url: null,
      }),
    );
    await this.audiencias.save(
      this.audiencias.create({
        despacho_id: despacho.id,
        expediente_id: expediente.id,
        titulo: 'Audiencia inicial',
        fecha: fecha(3),
        hora: '10:00',
        lugar: 'Sala 2, Tepic',
        notas: null,
      }),
    );
    await this.documentos.save(
      this.documentos.create({
        despacho_id: despacho.id,
        expediente_id: expediente.id,
        titulo: 'Convenio de prestación de servicios',
        clasificacion: 'interno',
        archivo_url: null,
        notas: 'Documento de prueba, visible para el despacho.',
      }),
    );
    await this.cargos.save(
      this.cargos.create({
        despacho_id: despacho.id,
        cliente_id: cliente.id,
        asunto_id: asunto.id,
        concepto: 'Anticipo 50%',
        monto: '15000.00',
        vence_el: fecha(4),
      }),
    );
    await this.depositos.save(
      this.depositos.create({
        despacho_id: despacho.id,
        cliente_id: cliente.id,
        asunto_id: asunto.id,
        cuenta_bancaria_id: null,
        monto: '5000.00',
        fecha: fecha(0),
        referencia: 'PRUEBA-001',
        estado: 'pendiente',
        motivo: null,
        abono_id: null,
      }),
    );
  }
}

function demoActivo(config: ConfigService) {
  const flag = config.get<string>('SEED_DEMO');
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return config.get<string>('NODE_ENV') !== 'production';
}

function fecha(dias: number) {
  const date = new Date();
  date.setDate(date.getDate() + dias);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
