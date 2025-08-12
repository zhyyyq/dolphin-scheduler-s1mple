export const AlertEnum = {
  sms: 'sms',
  oa: 'oa',
  companyWechat: 'companyWechat'
}

const sms_python_command = `
print("mock sms")
`
const oa_python_command = `
print("mock oa")
`
const company_wechat_python_command = `
print("mock company_wechat")
`
export const getAlertCommandByAlertChannel = (alertType: string) => {

  switch (alertType) {
    case AlertEnum.sms:
      return sms_python_command
    case AlertEnum.oa:
      return oa_python_command
    case AlertEnum.companyWechat:
      return company_wechat_python_command
  }
  throw new Error("undefined alert type")



}