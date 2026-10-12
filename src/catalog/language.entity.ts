import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('languages')
export class Language {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ name: 'iso_code', length: 2, unique: true })
  isoCode: string;
}
