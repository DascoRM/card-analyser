-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "cardArtist" TEXT,
ADD COLUMN     "cardImageUrl" TEXT,
ADD COLUMN     "cardNumber" TEXT,
ADD COLUMN     "cardRarity" TEXT,
ADD COLUMN     "identificationConfidence" DOUBLE PRECISION,
ADD COLUMN     "identificationMethod" TEXT,
ADD COLUMN     "pokemonTcgApiId" TEXT;
