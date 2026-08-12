import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { SystemSetting } from './entities/system-setting.entity';

export const NEW_ACCOUNT_CREDITS_SETTING = 'new_account_credits';

export interface NewAccountCreditsSetting {
  enabled: boolean;
  credits: number;
}

const disabledNewAccountCredits: NewAccountCreditsSetting = {
  enabled: false,
  credits: 0,
};

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settings: Repository<SystemSetting>,
  ) {}

  getNewAccountCredits(manager?: EntityManager) {
    const repository = manager?.getRepository(SystemSetting) ?? this.settings;
    return repository
      .findOneBy({ key: NEW_ACCOUNT_CREDITS_SETTING })
      .then((setting) => this.parseNewAccountCredits(setting?.value));
  }

  async updateNewAccountCredits(
    value: NewAccountCreditsSetting,
    actorUserId: string,
  ) {
    const normalized = {
      enabled: value.enabled,
      credits: Math.trunc(value.credits),
    } satisfies NewAccountCreditsSetting;

    await this.settings.upsert(
      {
        key: NEW_ACCOUNT_CREDITS_SETTING,
        value: normalized,
        updatedByUserId: actorUserId,
      },
      ['key'],
    );

    const setting = await this.settings.findOneByOrFail({
      key: NEW_ACCOUNT_CREDITS_SETTING,
    });

    return {
      ...this.parseNewAccountCredits(setting.value),
      updated_at: setting.updatedAt,
    };
  }

  private parseNewAccountCredits(
    value: Record<string, unknown> | null | undefined,
  ): NewAccountCreditsSetting {
    if (!value) return disabledNewAccountCredits;

    const credits = Number(value.credits);
    return {
      enabled: value.enabled === true,
      credits:
        Number.isSafeInteger(credits) && credits >= 0 ? credits : 0,
    };
  }
}
