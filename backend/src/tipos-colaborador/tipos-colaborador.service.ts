import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Colaborador } from '../entities/colaborador.entity';
import { Grupo } from '../entities/grupo.entity';
import { TipoColaborador } from '../entities/tipo-colaborador.entity';
import { User } from '../entities/user.entity';
import { TipoColaboradorDto } from './dto';

@Injectable()
export class TiposColaboradorService {
  constructor(
    @InjectRepository(TipoColaborador) private readonly tipos: Repository<TipoColaborador>,
    @InjectRepository(Colaborador) private readonly colaboradores: Repository<Colaborador>,
    @InjectRepository(Grupo) private readonly grupos: Repository<Grupo>,
  ) {}

  async list() {
    await this.asegurarDesdePuestos();
    const [tipos, grupos] = await Promise.all([
      this.tipos.find({ order: { descripcion: 'ASC' } }),
      this.grupos.find(),
    ]);
    const grupoDe = new Map(grupos.map((grupo) => [grupo.id, grupo.nombre]));
    return tipos.map((tipo) => ({ ...tipo, grupo: tipo.grupo_id ? grupoDe.get(tipo.grupo_id) ?? null : null }));
  }

  async create(dto: TipoColaboradorDto) {
    const descripcion = dto.descripcion.trim();
    const tomado = await this.tipos.findOne({ where: { descripcion } });
    if (tomado) throw new ConflictException(`Ya existe el tipo «${descripcion}».`);
    const grupoId = await this.grupoLibre(dto.grupo_id);
    return this.tipos.save(this.tipos.create({ descripcion, grupo_id: grupoId }));
  }

  async update(id: number, dto: TipoColaboradorDto) {
    const tipo = await this.find(id);
    const descripcion = dto.descripcion.trim();
    const tomado = await this.tipos.findOne({ where: { descripcion } });
    if (tomado && tomado.id !== id) throw new ConflictException(`Ya existe el tipo «${descripcion}».`);
    tipo.descripcion = descripcion;
    if (dto.grupo_id !== undefined) tipo.grupo_id = await this.grupoLibre(dto.grupo_id, id);
    await this.tipos.save(tipo);
    await this.colaboradores.update({ tipo_id: id }, { puesto: descripcion });
    const personas = await this.colaboradores.find({ where: { tipo_id: id } });
    for (const persona of personas) {
      if (persona.usuario_id) {
        await this.colaboradores.manager.update(User, persona.usuario_id, { grupo_id: tipo.grupo_id });
      }
    }
    return { ...tipo, grupo: tipo.grupo_id ? (await this.grupos.findOne({ where: { id: tipo.grupo_id } }))?.nombre ?? null : null };
  }

  private async grupoLibre(grupoId: number | null | undefined, excepto?: number) {
    if (!grupoId) return null;
    const grupo = await this.grupos.findOne({ where: { id: grupoId } });
    if (!grupo) throw new NotFoundException('No encontramos ese grupo.');
    const dueno = await this.tipos.findOne({ where: { grupo_id: grupoId } });
    if (dueno && dueno.id !== excepto) {
      throw new ConflictException(`Ese grupo ya corresponde al puesto ${dueno.descripcion}.`);
    }
    return grupoId;
  }

  async remove(id: number) {
    await this.find(id);
    const enUso = await this.colaboradores.count({ where: { tipo_id: id } });
    if (enUso > 0) throw new ConflictException('Ese tipo tiene colaboradores. Cámbialos de tipo antes de eliminarlo.');
    await this.tipos.delete(id);
    return { ok: true };
  }

  private async find(id: number) {
    const tipo = await this.tipos.findOne({ where: { id } });
    if (!tipo) throw new NotFoundException('No encontramos ese tipo de colaborador.');
    return tipo;
  }

  private async asegurarDesdePuestos() {
    const huerfanos = await this.colaboradores.find({ where: { tipo_id: IsNull() } });
    for (const row of huerfanos) {
      const descripcion = row.puesto?.trim();
      if (!descripcion) continue;
      let tipo = await this.tipos.findOne({ where: { descripcion } });
      if (!tipo) {
        try {
          tipo = await this.tipos.save(this.tipos.create({ descripcion }));
        } catch {
          tipo = await this.tipos.findOne({ where: { descripcion } });
        }
      }
      if (!tipo) continue;
      row.tipo_id = tipo.id;
      await this.colaboradores.save(row);
    }
  }
}
