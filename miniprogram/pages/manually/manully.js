const util = require('../../utils/util.js');

Page({
  formSubmit(e) {
    const { issuer, secret, label } = e.detail.value;
    if (!secret || !label) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }
    const tokenData = {
      issuer: issuer,
      secret: secret,
      label: label,
    };
    util.addToken(tokenData,'man');
  }
})