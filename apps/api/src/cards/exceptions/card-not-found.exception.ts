import { NotFoundException } from '@nestjs/common';

export class CardNotFoundException extends NotFoundException {
  constructor(cardName: string, cardSet?: string) {
    super(
      `Card not found: ${cardName}${cardSet ? ` in set ${cardSet}` : ''}`,
    );
  }
}
