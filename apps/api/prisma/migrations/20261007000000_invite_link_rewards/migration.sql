-- Allow invite links that are not tied to a generated image.
ALTER TABLE `ShareAttribution`
  MODIFY `generationId` VARCHAR(191) NULL;
