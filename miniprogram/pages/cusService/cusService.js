// pages/cusService/cusService.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    contactInfo: "",
    feedbackContent: ""
  },

  sendEmail: function () {

  },

  submitForm(e) {
    const {
      contactInfo,
      feedbackContent
    } = e.detail.value;
    console.log('Contact Info:', contactInfo);
    console.log('Feedback Content:', feedbackContent);

    const db = wx.cloud.database();
    db.collection("feedback").add({
      data: {
        contactInfo: contactInfo,
        feedbackContent: feedbackContent
      }
    }).then(res => {
      if (res && res._id) {
        wx.reLaunch({
          url: '../index/index',
        })
        wx.showToast({
          title: '提交成功',
          icon: 'none',
          duration: 2000
        })
      }
    }).catch(_err => {
      wx.showToast({
        title: '服务异常',
        icon: 'none',
        duration: 2000
      })
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})