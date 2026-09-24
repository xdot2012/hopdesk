export type FieldValidationError = {
  field: string;
  type: string;
  message: string;
};

export type ErrorResponse = {
  detail: FieldValidationError[];
};
