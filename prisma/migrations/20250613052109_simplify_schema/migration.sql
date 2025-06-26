/*
  Warnings:

  - You are about to drop the column `apiKey` on the `Instance` table. All the data in the column will be lost.
  - You are about to drop the column `webhookUrl` on the `Instance` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "EvolutionSettings" DROP CONSTRAINT "EvolutionSettings_userId_fkey";

-- DropForeignKey
ALTER TABLE "Instance" DROP CONSTRAINT "Instance_userId_fkey";

-- AlterTable
ALTER TABLE "Instance" DROP COLUMN "apiKey",
DROP COLUMN "webhookUrl",
ADD COLUMN     "ownerJid" TEXT,
ADD COLUMN     "profileName" TEXT,
ADD COLUMN     "profilePictureUrl" TEXT,
ALTER COLUMN "status" SET DEFAULT 'disconnected';

-- AddForeignKey
ALTER TABLE "EvolutionSettings" ADD CONSTRAINT "EvolutionSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instance" ADD CONSTRAINT "Instance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
