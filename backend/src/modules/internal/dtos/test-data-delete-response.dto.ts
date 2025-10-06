export class TestDataDeleteResponseDTO {
  public deleted: boolean;
  public message: string;

  constructor(params: { deleted: boolean; message: string }) {
    this.deleted = params.deleted;
    this.message = params.message;
  }
}
