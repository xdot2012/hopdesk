import { Star } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useRateTicketSatisfaction from '~/api/ticket/rateTicketSatisfaction';
import type { TicketDetail } from '~/api/ticket/types';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { cn } from '~/lib/utils';
import { useAlertStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';

type Props = {
  ticket: TicketDetail;
  mode: 'rate' | 'view';
  onRated?: () => void | Promise<void>;
};

const RATINGS = [1, 2, 3, 4, 5] as const;

const textareaClassName =
  'min-h-[5rem] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40';

export default function TicketSatisfactionPanel({ ticket, mode, onRated }: Props) {
  const { t } = useTranslation();
  const { showErrorSnack, showSuccessSnack } = useAlertStore();
  const { trigger, isMutating } = useRateTicketSatisfaction(ticket.id);
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  if (mode === 'view') {
    if (ticket.satisfactionRating == null) return null;
    return (
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t('tickets.satisfaction.viewTitle')}
        </h3>
        <div className="flex items-center gap-1" aria-label={t('tickets.satisfaction.ratingLabel')}>
          {RATINGS.map((value) => (
            <Star
              key={value}
              className={cn(
                'h-5 w-5',
                value <= ticket.satisfactionRating!
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/40',
              )}
              aria-hidden
            />
          ))}
          <span className="ml-2 text-sm tabular-nums text-muted-foreground">
            {t('tickets.satisfaction.ratingValue', { rating: ticket.satisfactionRating })}
          </span>
        </div>
        {ticket.satisfactionComment ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {ticket.satisfactionComment}
          </p>
        ) : null}
      </div>
    );
  }

  const activeRating = hoverRating ?? rating;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (rating == null) return;
    try {
      await trigger({
        rating,
        comment: comment.trim() || undefined,
      });
      showSuccessSnack(t('tickets.satisfaction.success'));
      await onRated?.();
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('tickets.satisfaction.error')));
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4"
      aria-label={t('tickets.satisfaction.formLabel')}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          {t('tickets.satisfaction.title')}
        </h3>
        <p className="text-sm text-muted-foreground">{t('tickets.satisfaction.subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Label>{t('tickets.satisfaction.ratingLabel')}</Label>
        <div className="flex flex-wrap items-center gap-1">
          {RATINGS.map((value) => {
            const selected = activeRating != null && value <= activeRating;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(null)}
                className={cn(
                  'rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? 'text-amber-500' : 'text-muted-foreground/50 hover:text-amber-400',
                )}
                aria-label={t('tickets.satisfaction.ratingOption', { rating: value })}
                aria-pressed={rating === value}
              >
                <Star className={cn('h-7 w-7', selected && 'fill-amber-400')} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`ticket-satisfaction-comment-${ticket.id}`}>
          {t('tickets.satisfaction.commentLabel')}
        </Label>
        <textarea
          id={`ticket-satisfaction-comment-${ticket.id}`}
          className={textareaClassName}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t('tickets.satisfaction.commentPlaceholder')}
          maxLength={1000}
          rows={3}
          disabled={isMutating}
        />
      </div>

      <Button type="submit" disabled={rating == null || isMutating}>
        {isMutating ? t('tickets.satisfaction.submitting') : t('tickets.satisfaction.submit')}
      </Button>
    </form>
  );
}
