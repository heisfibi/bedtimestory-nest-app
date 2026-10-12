import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaFiles } from '../books/media-files.js';
import { MusicTrack } from './music-track.entity.js';

/** The sound file's extension, judged by its first bytes, or null if it isn't an MP3, M4A/AAC, Ogg or WAV. */
export function audioExtension(data: Buffer) {
  const text = (start: number, end: number) =>
    data.subarray(start, end).toString('latin1');
  if (text(0, 3) === 'ID3') return '.mp3';
  // An MP3 without tags starts with a frame header: 11 set bits.
  if (data.length >= 2 && data[0] === 0xff && (data[1] & 0xe0) === 0xe0) {
    // ...which an ADTS AAC stream shares; its layer bits are 00.
    return (data[1] & 0x06) === 0 ? '.aac' : '.mp3';
  }
  if (text(4, 8) === 'ftyp') return '.m4a';
  if (text(0, 4) === 'OggS') return '.ogg';
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WAVE') return '.wav';
  return null;
}

@Injectable()
export class MusicService {
  constructor(
    @InjectRepository(MusicTrack)
    private readonly tracks: Repository<MusicTrack>,
    private readonly media: MediaFiles,
  ) {}

  /** In the Music screen's order, with absolute URLs. */
  async list(origin: string) {
    const tracks = await this.tracks.find({
      order: { position: 'ASC', id: 'ASC' },
    });
    return tracks.map(({ id, name, file }) => ({
      id,
      name,
      url: `${origin}/media/${file}`,
    }));
  }

  async add(name: string, data: Buffer) {
    const extension = audioExtension(data);
    if (!extension) {
      throw new BadRequestException(
        'The sound must be an MP3, M4A, AAC, Ogg or WAV file',
      );
    }
    const file = await this.media.save('music', data, extension);
    const last = await this.tracks.maximum('position');
    await this.tracks.save({ name, file, position: (last ?? -1) + 1 });
  }

  async rename(id: number, name: string) {
    await this.find(id);
    await this.tracks.update(id, { name });
  }

  async reorder(ids: number[]) {
    const tracks = await this.tracks.find();
    const known = new Set(tracks.map((track) => track.id));
    if (ids.length !== known.size || !ids.every((id) => known.has(id))) {
      throw new BadRequestException('List every track once, in the new order');
    }
    await this.tracks.manager.transaction(async (manager) => {
      for (const [position, id] of ids.entries()) {
        await manager.update(MusicTrack, id, { position });
      }
    });
  }

  async remove(id: number) {
    const track = await this.find(id);
    await this.tracks.delete(id);
    await this.media.remove(track.file);
  }

  private async find(id: number) {
    const track = await this.tracks.findOneBy({ id });
    if (!track) throw new NotFoundException(`Track ${id} not found`);
    return track;
  }
}
