import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'full_name', type: 'varchar' })
  fullName!: string;

  @Index({ unique: true })
  @Column({ nullable: true, type: 'varchar' })
  username!: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  email!: string;

  @Column({ nullable: true, type: 'varchar' })
  password!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  phone!: string | null;

  @Column({ default: 'user', type: 'varchar' })
  role!: 'user' | 'admin';

  @Column({ nullable: true, type: 'text' })
  address!: string | null;

  @Column({ name: 'date_of_birth', nullable: true, type: 'date' })
  dateOfBirth!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  gender!: string | null;

  @Column({ nullable: true, type: 'text' })
  avatar!: string | null;

  @Column({ nullable: true, type: 'text' })
  bio!: string | null;

  @Index({ unique: true })
  @Column({ name: 'google_id', nullable: true, type: 'varchar' })
  googleId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
