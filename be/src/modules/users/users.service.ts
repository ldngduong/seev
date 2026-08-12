import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { User } from './entities/user.entity';

const DEFAULT_SIGNUP_CREDITS = '40';

export interface CreateUserInput {
  fullName: string;
  username?: string | null;
  email: string;
  password?: string | null;
  phone?: string | null;
  role?: 'user' | 'admin';
  address?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  avatar?: string | null;
  bio?: string | null;
  googleId?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  findById(id: string) {
    return this.userRepository.findOneBy({ id });
  }

  findByEmail(email: string) {
    return this.userRepository.findOneBy({ email: this.normalizeEmail(email) });
  }

  findByGoogleId(googleId: string) {
    return this.userRepository.findOneBy({ googleId });
  }

  async create(input: CreateUserInput) {
    const email = this.normalizeEmail(input.email);
    const username = input.username?.trim() || null;

    await this.assertUniqueIdentity(email, username);

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).save(
        manager.getRepository(User).create({
        fullName: input.fullName.trim(),
        username,
        email,
        password: input.password ?? null,
        phone: input.phone?.trim() || null,
        role: input.role ?? 'user',
        address: input.address?.trim() || null,
        dateOfBirth: input.dateOfBirth ?? null,
        gender: input.gender?.trim() || null,
        avatar: input.avatar?.trim() || null,
        bio: input.bio?.trim() || null,
        googleId: input.googleId ?? null,
        }),
      );
      await manager.query(
        `INSERT INTO credit_accounts (user_id, balance)
         VALUES ($1, $2)`,
        [user.id, DEFAULT_SIGNUP_CREDITS],
      );
      await manager.query(
        `INSERT INTO credit_transactions
          (user_id, type, amount_delta, balance_before, balance_after, idempotency_key, reason, metadata)
         VALUES ($1, 'opening_balance', $2, 0, $2, $3, $4, $5::jsonb)`,
        [
          user.id,
          DEFAULT_SIGNUP_CREDITS,
          `signup:${user.id}`,
          'Credit chào mừng khi tạo tài khoản',
          JSON.stringify({ source: 'signup' }),
        ],
      );
      return user;
    });
  }

  async update(user: User, patch: Partial<CreateUserInput>) {
    const nextUsername =
      patch.username === undefined
        ? user.username
        : patch.username?.trim() || null;
    const nextEmail =
      patch.email === undefined ? user.email : this.normalizeEmail(patch.email);

    if (nextEmail !== user.email || nextUsername !== user.username) {
      await this.assertUniqueIdentity(nextEmail, nextUsername, user.id);
    }

    Object.assign(user, {
      ...patch,
      email: nextEmail,
      username: nextUsername,
      fullName: patch.fullName?.trim() ?? user.fullName,
      phone:
        patch.phone === undefined ? user.phone : patch.phone?.trim() || null,
      address:
        patch.address === undefined
          ? user.address
          : patch.address?.trim() || null,
      gender:
        patch.gender === undefined ? user.gender : patch.gender?.trim() || null,
      avatar:
        patch.avatar === undefined ? user.avatar : patch.avatar?.trim() || null,
      bio: patch.bio === undefined ? user.bio : patch.bio?.trim() || null,
    });

    return this.userRepository.save(user);
  }

  async generateAvailableUsername(
    email: string,
    preferredName?: string | null,
  ) {
    const seed =
      preferredName
        ?.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase() ||
      email
        .split('@')[0]
        ?.replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase() ||
      'user';

    let username = seed || 'user';
    let suffix = 1;

    while (await this.userRepository.findOneBy({ username })) {
      suffix += 1;
      username = `${seed || 'user'}_${suffix}`;
    }

    return username;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private async assertUniqueIdentity(
    email: string,
    username: string | null,
    currentUserId?: string,
  ) {
    const emailOwner = await this.userRepository.findOneBy({ email });

    if (emailOwner && emailOwner.id !== currentUserId) {
      throw new ConflictException('Email đã được đăng ký.');
    }

    if (!username) {
      return;
    }

    const usernameOwner = await this.userRepository.findOneBy({ username });

    if (usernameOwner && usernameOwner.id !== currentUserId) {
      throw new ConflictException('Tên đăng nhập đã được sử dụng.');
    }
  }
}
