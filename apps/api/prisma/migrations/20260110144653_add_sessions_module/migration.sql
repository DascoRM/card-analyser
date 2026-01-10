-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'UPLOADING', 'ANALYZING', 'COMPLETED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CardSide" AS ENUM ('FRONT', 'BACK');

-- CreateEnum
CREATE TYPE "GradeScale" AS ENUM ('PCA', 'PSA');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "cardName" TEXT,
    "cardSet" TEXT,
    "cardYear" INTEGER,
    "cardType" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionImage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "side" "CardSide" NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "scale" "GradeScale" NOT NULL,
    "centering" DOUBLE PRECISION NOT NULL,
    "corners" DOUBLE PRECISION NOT NULL,
    "edges" DOUBLE PRECISION NOT NULL,
    "surface" DOUBLE PRECISION NOT NULL,
    "printQuality" DOUBLE PRECISION NOT NULL,
    "finalGrade" DOUBLE PRECISION NOT NULL,
    "gradeLabel" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "modelVersion" TEXT,
    "analysisData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_status_idx" ON "Session"("userId", "status");

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");

-- CreateIndex
CREATE INDEX "SessionImage_sessionId_idx" ON "SessionImage"("sessionId");

-- CreateIndex
CREATE INDEX "GradeResult_sessionId_idx" ON "GradeResult"("sessionId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionImage" ADD CONSTRAINT "SessionImage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeResult" ADD CONSTRAINT "GradeResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
