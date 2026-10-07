/** Mirrors com.edugame.common.exception.ApiError on the backend. */
export interface ApiError {
  timestamp?: string
  status: number
  code: string
  message: string
  path?: string
  violations?: FieldViolation[]
}

export interface FieldViolation {
  field: string
  message: string
}
