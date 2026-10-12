import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Everyone who has narrated a voice-over in any book, so the studio can offer
// them in a list instead of having the name typed again. Collected from the
// .akuko files as books are saved.
@Entity('narrators')
export class Narrator {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60, unique: true })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
