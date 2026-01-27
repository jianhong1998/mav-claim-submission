export class AmountUtil {
  private constructor() {}

  public static convertCentToDollar(cent: number): number {
    return cent / 100;
  }
}
