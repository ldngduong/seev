import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserCvParserVersion1785856377813 implements MigrationInterface {
    name = 'AddUserCvParserVersion1785856377813'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_cvs" ADD "parser_version" integer NOT NULL DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_cvs" DROP COLUMN "parser_version"`);
    }

}
