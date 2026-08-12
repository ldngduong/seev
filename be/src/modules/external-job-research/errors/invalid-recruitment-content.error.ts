export class InvalidRecruitmentContentError extends Error {
  constructor(message = 'Nội dung đã cung cấp không đủ thông tin tuyển dụng để đánh giá.') {
    super(message);
    this.name = 'InvalidRecruitmentContentError';
  }
}
