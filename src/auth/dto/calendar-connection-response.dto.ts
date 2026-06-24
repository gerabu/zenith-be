export class CalendarConnectionResponseDto {
  public readonly message: string;
  public readonly calendarConnected: boolean;

  private constructor({
    message,
    calendarConnected,
  }: {
    message: string;
    calendarConnected: boolean;
  }) {
    this.message = message;
    this.calendarConnected = calendarConnected;
  }

  static connected(): CalendarConnectionResponseDto {
    return new CalendarConnectionResponseDto({
      message: 'Your Google Calendar has been connected successfully.',
      calendarConnected: true,
    });
  }
}
