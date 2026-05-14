# Clocks Page Requirements

Build a single HTML page that displays analog clocks arranged in two rows.

The design has artistic freedom, but the clocks should read as analog dials:
circular faces, meaningful tick marks, and hands whose length and weight
communicate their scale.

## Clock Style

- Use analog clock faces for every clock.
- Use longer, lighter hands for fine-grained progress.
- Use shorter, heavier hands for larger units.
- Add extra hands only when each hand has a clear matching scale on the dial.
- Label enough tick marks to make the increment scale clear without cluttering
  the dial.
- When a hand uses an inner ring, the ring labels should directly match what
  that hand measures.

## Row 1: Calendar Clocks

The first row shows fixed calendar-based clocks:

| Clock | Range | Primary scale | Hands and rings |
| --- | --- | --- | --- |
| Century | 100 years | Year within century | One hand tracking continuous year-within-century progress; outer ring labels decades and inner ring labels `00-99` |
| Decade | 10 years | Year within decade | Short hand for year position, longer hand for month progress; inner ring labels months |
| Year | 1 year | 52 weeks | Short hand for month position, longer hand for week progress; outer ring labels weeks and inner ring labels months |
| 24-hour day | 1 day | 24 hours | 24-hour hand, minute hand, and second hand; outer ring labels hours `0-23` and inner ring labels minutes |

## Row 2: User Clocks

The second row shows clocks personalized to the user.

### Birthday Input

- The user sets their birthday through dropdowns for year, month, and day.
- The birthday is saved in browser long-term storage.
- The saved birthday is reused when the page is reopened.
- Users older than 100 years are excluded.
- The interface should prevent selecting or saving a birthday that would make
  the user older than 100.

### Personalized Clocks

| Clock | Range | Primary scale | Hands and rings |
| --- | --- | --- | --- |
| Lifetime century | 100 years from the user's birthday | Age within 100 years | Short hand tracks total lifetime progress; long hand tracks year within the current life decade; inner ring labels `0-10` |
| Personal year | 1 year starting on the user's birthday | 52 weeks, with half-week minor ticks | One hand tracks week progress through the birthday-to-birthday year; label quarter marks and the midpoint between each quarter |

## Dial Detail

- Add inner rings of symbols or numbers where shorter hands use a different
  scale than the outer dial.
- Do not add decorative inner rings that do not correspond to a hand.
- The 24-hour day clock should make the hour scale clear as a full-day dial,
  not a traditional 12-hour clock.
