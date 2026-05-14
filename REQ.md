# Clocks Page Requirements

Build a single HTML page that displays analog clocks arranged in two rows.

The design has artistic freedom, but the clocks should read as traditional
analog dials: circular faces, meaningful tick marks, and hands whose length and
weight communicate their scale.

## Clock Style

- Use analog clock faces for every clock.
- Use longer, lighter hands for fine-grained progress.
- Use shorter, heavier hands for larger units.
- Add extra hands when they make the clock easier to understand, especially
  when a clock has both coarse and fine progress worth showing.
- Label enough tick marks to make the increment scale clear without cluttering
  the dial.

## Row 1: Calendar Clocks

The first row shows fixed calendar-based clocks:

| Clock | Range | Primary increments | Suggested hands |
| --- | --- | --- | --- |
| Century | 100 years | 10 years | Short hand for decade position, longer hand for current year within the decade |
| Decade | 10 years | 1 year | Short hand for year position, longer hand for month progress within the year |
| Year | 1 year | 52 weeks | Short hand for quarter or month position, longer hand for week progress |
| Day | 1 day | 24 hours | 24-hour hand, minute hand, and second hand |

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

| Clock | Range | Primary increments | Suggested hands |
| --- | --- | --- | --- |
| Lifetime century | 100 years from the user's birthday | 10 years | Short hand for decade of life, longer hand for current year within that decade |
| Personal year | 1 year starting on the user's birthday | 52 weeks | Short hand for month or season position, longer hand for week progress |

## Dial Detail

- Add inner rings of symbols or numbers where shorter hands use a different
  scale than the outer dial.
- The 24-hour day clock should make the hour scale clear as a full-day dial,
  not a traditional 12-hour clock.
