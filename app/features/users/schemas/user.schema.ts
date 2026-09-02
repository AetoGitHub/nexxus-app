interface UserSchemaMessages {
  usernameRequired: string
  passwordRequired: string
  passwordMin: string
  passwordNumber: string
  passwordLowercase: string
  passwordUppercase: string
  emailInvalid: string
  corporateEmailInvalid: string
}

interface ChangePasswordSchemaMessages {
  currentPasswordRequired: string
  passwordRequired: string
  passwordMin: string
  passwordNumber: string
  passwordLowercase: string
  passwordUppercase: string
  confirmationRequired: string
  passwordsMismatch: string
}

function strongPassword(messages: Pick<
  UserSchemaMessages,
  | 'passwordRequired'
  | 'passwordMin'
  | 'passwordNumber'
  | 'passwordLowercase'
  | 'passwordUppercase'
>) {
  return z.string({ error: messages.passwordRequired })
    .min(1, messages.passwordRequired)
    .min(8, messages.passwordMin)
    .regex(/\d/, messages.passwordNumber)
    .regex(/[a-z]/, messages.passwordLowercase)
    .regex(/[A-Z]/, messages.passwordUppercase)
}

const optionalEmail = (message: string) =>
  z.string().trim().email(message).or(z.literal(''))

export function createUserSchema(messages: UserSchemaMessages) {
  return z.object({
    username: z.string({ error: messages.usernameRequired })
      .trim()
      .min(1, messages.usernameRequired),
    password: strongPassword(messages),
    first_name: z.string().trim(),
    last_name: z.string().trim(),
    email: optionalEmail(messages.emailInvalid),
    corporate_email: optionalEmail(messages.corporateEmailInvalid),
    whatsapp: z.string().trim(),
  })
}

export function createUpdateUserSchema(
  messages: Pick<UserSchemaMessages, 'usernameRequired' | 'emailInvalid' | 'corporateEmailInvalid'>,
) {
  return z.object({
    username: z.string({ error: messages.usernameRequired })
      .trim()
      .min(1, messages.usernameRequired),
    first_name: z.string().trim(),
    last_name: z.string().trim(),
    email: optionalEmail(messages.emailInvalid),
    corporate_email: optionalEmail(messages.corporateEmailInvalid),
    whatsapp: z.string().trim(),
  })
}

export function createChangePasswordSchema(messages: ChangePasswordSchemaMessages) {
  return z.object({
    old_password: z.string({ error: messages.currentPasswordRequired })
      .min(1, messages.currentPasswordRequired),
    password1: strongPassword(messages),
    password2: z.string({ error: messages.confirmationRequired })
      .min(1, messages.confirmationRequired),
  }).refine(data => data.password1 === data.password2, {
    message: messages.passwordsMismatch,
    path: ['password2'],
  })
}

export type CreateUserSchema = z.output<ReturnType<typeof createUserSchema>>
export type UpdateUserSchema = z.output<ReturnType<typeof createUpdateUserSchema>>
export type ChangePasswordSchema = z.output<ReturnType<typeof createChangePasswordSchema>>
