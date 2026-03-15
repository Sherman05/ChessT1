import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getPieceImagePath, PIECE_NAMES, PieceKind } from '../types/chess';
import { getPromotionDialogPosition } from '../logic/promotion';
import './PromotionDialog.css';

export const PromotionDialog: React.FC = () => {
  const promotionContext = useGameStore(s => s.promotionContext);
  const completePromotion = useGameStore(s => s.completePromotion);

  if (!promotionContext) return null;

  const { piece, options } = promotionContext;
  const position = getPromotionDialogPosition(piece.color);

  return (
    <div className={`promotion-dialog ${position}`}>
      {options.map((kind: PieceKind) => (
        <div
          key={kind}
          className="promotion-option"
          onClick={() => completePromotion(kind)}
          title={PIECE_NAMES[kind]}
        >
          <img
            src={getPieceImagePath(kind, piece.color)}
            alt={PIECE_NAMES[kind]}
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
};
