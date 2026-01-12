-- CreateTable
CREATE TABLE "GradeFeedback" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "centering" DOUBLE PRECISION NOT NULL,
    "corners" DOUBLE PRECISION NOT NULL,
    "edges" DOUBLE PRECISION NOT NULL,
    "surface" DOUBLE PRECISION NOT NULL,
    "printQuality" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeFeedback_resultId_idx" ON "GradeFeedback"("resultId");

-- CreateIndex
CREATE INDEX "GradeFeedback_userId_idx" ON "GradeFeedback"("userId");

-- AddForeignKey
ALTER TABLE "GradeFeedback" ADD CONSTRAINT "GradeFeedback_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "GradeResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeFeedback" ADD CONSTRAINT "GradeFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
