export class CalendarConnectionStatusResponseDto {
  public readonly calendarConnected: boolean;

  private constructor(calendarConnected: boolean) {
    this.calendarConnected = calendarConnected;
  }

  static from(connected: boolean): CalendarConnectionStatusResponseDto {
    return new CalendarConnectionStatusResponseDto(connected);
  }
}
