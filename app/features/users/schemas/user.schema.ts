import { USER_IMAGE_URL_MAX_LENGTH, normalizeUserColor } from '~/features/users/utils/user-appearance.util'

interface UserSchemaMessages {
  usernameRequired: string
  passwordRequired: string
  passwordMin: string
  passwordNumber: string
  passwordLowercase: string
  passwordUppercase: string
  emailInvalid: string
  corporateEmailInvalid: string
  organizationRequired: string
  companyRequired: string
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

/** Fondo del círculo: color `#rrggbb` o vacío, y URL de la foto (la sube el formulario) o vacía. */
const backgroundColor = z.string().trim().transform(normalizeUserColor)
const backgroundImage = z.string().trim().max(USER_IMAGE_URL_MAX_LENGTH)

const requiredId = (message: string) =>
  z.number({ error: message }).int().positive(message)

export function createUserSchema(messages: UserSchemaMessages) {
  return z.object({
    username: z.string({ error: messages.usernameRequired })
      .trim()
      .min(1, messages.usernameRequired),
    password: strongPassword(messages),
    organization: requiredId(messages.organizationRequired),
    company: requiredId(messages.companyRequired),
    first_name: z.string().trim().transform(toNameCase),
    last_name: z.string().trim().transform(toNameCase),
    email: optionalEmail(messages.emailInvalid),
    corporate_email: optionalEmail(messages.corporateEmailInvalid),
    whatsapp: z.string().trim(),
    background_color: backgroundColor,
    background_image: backgroundImage,
  })
}

export function createUpdateUserSchema(
  messages: Pick<UserSchemaMessages, 'usernameRequired' | 'emailInvalid' | 'corporateEmailInvalid'>,
) {
  return z.object({
    username: z.string({ error: messages.usernameRequired })
      .trim()
      .min(1, messages.usernameRequired),
    first_name: z.string().trim().transform(toNameCase),
    last_name: z.string().trim().transform(toNameCase),
    email: optionalEmail(messages.emailInvalid),
    corporate_email: optionalEmail(messages.corporateEmailInvalid),
    whatsapp: z.string().trim(),
    background_color: backgroundColor,
    background_image: backgroundImage,
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
