import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaFiles } from '../books/media-files.js';
import { AppBackground } from './background.entity.js';
import {
  BACKGROUND_SLOTS,
  imageExtension,
  isBackgroundSlot,
} from './background-slots.js';

@Injectable()
export class BackgroundsService {
  constructor(
    @InjectRepository(AppBackground)
    private readonly backgrounds: Repository<AppBackground>,
    private readonly media: MediaFiles,
  ) {}

  /** The replaced backgrounds, keyed by slot, with absolute URLs. */
  async list(origin: string) {
    const rows = await this.backgrounds.find();
    const result: Record<string, { url: string; updated_at: string }> = {};
    for (const row of rows) {
      if (!isBackgroundSlot(row.slot)) continue;
      result[row.slot] = {
        url: `${origin}/media/${row.image}`,
        updated_at: row.updatedAt.toISOString(),
      };
    }
    return result;
  }

  async replace(slot: string, data: Buffer) {
    this.checkSlot(slot);
    const extension = imageExtension(data);
    if (!extension) {
      throw new BadRequestException('The picture must be a JPEG, PNG or WebP');
    }
    const image = await this.media.save('backgrounds', data, extension);
    const old = await this.backgrounds.findOneBy({ slot });
    await this.backgrounds.save({ slot, image });
    await this.media.remove(old?.image);
  }

  /** Back to the app's built-in picture. */
  async reset(slot: string) {
    this.checkSlot(slot);
    const old = await this.backgrounds.findOneBy({ slot });
    if (!old) return;
    await this.backgrounds.delete({ slot });
    await this.media.remove(old.image);
  }

  private checkSlot(slot: string) {
    if (!isBackgroundSlot(slot)) {
      throw new BadRequestException(
        `Unknown background "${slot}". Use one of: ${BACKGROUND_SLOTS.join(', ')}`,
      );
    }
  }
}
