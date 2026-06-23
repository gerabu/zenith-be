-- AlterTable
ALTER TABLE "User" ADD COLUMN     "calendarConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleRefreshToken" TEXT;
