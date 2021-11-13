import OmniAural, { useOmniAural } from "omniaural"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import Modal from 'react-modal'
import { ButtonClose, ButtonLink, ButtonRectangle, TextInput } from "~/components"
import { login as loginService } from "~/services/auth"

type Props = {}

export const SignUpModal = (props: Props) => {
  const [signUp] = useOmniAural("modals.signUp")
  const { t } = useTranslation()
  const [email, setEmail] = useState<string>('')
  const [password1, setPassword1] = useState<string>('')
  const [password2, setPassword2] = useState<string>('')

  /* Event Handlers */

  const _handleSignUp = async () => {
    console.log('handleSignUp', email, password1, password2)
    try {
      // await loginService(email, password)
    } catch (error) {
      // const pleaseVerifyMessage = (
      //   <>
      //     <p>{t('PleaseVerifyEmail')}</p>
      //     {/* <span><a href='#' onClick={this._showSendVerificationEmailModal}>{t('SendVerificationEmail')}</a></span> */}
      //   </>
      // )
      // const errorMsg =
      //   (error.response && error.response.status === 460 && pleaseVerifyMessage) ||
      //   (error.response && error.response.data && error.response.data.message)
      //   || t('errorMessages:internetConnectivityErrorMessage')

      // TODO: handle error message
      console.log('errorMsg', error)
    }
  }

  const _onRequestClose = () => {
    OmniAural.modalsHideAll()
  }

  return (
    <Modal
      className='sign-up-modal centered'
      contentLabel={t('Sign up modal')}
      isOpen={signUp.show}
      onRequestClose={_onRequestClose}>
      <h2>{t('Sign Up')}</h2>
      <ButtonClose onClick={_onRequestClose} />
      <TextInput
        label={t('Email')}
        onChange={setEmail}
        placeholder={t('Email')}
        type='email'
        value={email} />
      <TextInput
        label={t('Password')}
        onChange={setPassword1}
        placeholder={t('Password')}
        type='password'
        value={password1} />
      <TextInput
        label={t('Confirm Password')}
        onChange={setPassword2}
        placeholder={t('Confirm Password')}
        type='password'
        value={password2} />
      <div className='submit-buttons'>
        <ButtonRectangle
          label={t('Cancel')}
          onClick={_onRequestClose}
          type='secondary' />
        <ButtonRectangle
          label={t('Submit')}
          onClick={_handleSignUp}
          type='primary' />
      </div>
    </Modal>
  )
}
