import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A soundtrack for the app's background music. While there are none, the app
 * plays the tracks built into it; once it has downloaded these, they take
 * their place (bedtime-story/music.ts).
 */
@Entity('music_tracks')
export class MusicTrack {
  @PrimaryGeneratedColumn()
  id: number;

  /** What the app's Music screen calls it. */
  @Column({ length: 100 })
  name: string;

  /** The sound file, relative to the media root. */
  @Column({ length: 255 })
  file: string;

  /** Order on the Music screen, from 0; the first is what plays until a child picks another. */
  @Column({ default: 0 })
  position: number;

  @CreateDateColumn()
  createdAt: Date;
}
