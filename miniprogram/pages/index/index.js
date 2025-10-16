const util = require("../../utils/util")
const TOTP = require("../../utils/totp")
Page({
  data: {
    rawList: [],
    list: [],
    countdown: 30,
    progress: 0,
    secretColor: "#0276f8",
  },

  onLoad: function (option) {
    self = this;
    wx.getStorage({
      key: 'token',
      success: function (res) {
        self.setData({
          rawList: res.data,
          list: util.convertSec(res.data)
        })
      },
      fail: function (res) {
        self.getDbData()
      }
    })
    self.updateData()
  },

  onShow: function () {
    const self = this;
    wx.getStorage({
      key: 'token',
      success: function (res) {
        self.setData({
          rawList: res.data,
          list: util.convertSec(res.data)
        })
      }
    })
  },

  onUnload: function () {
    clearInterval(this.countdownInterval)
  },

  //更多菜单
  more: function () {
    wx.showActionSheet({
      itemList: ["联系客服"],
      success: function (res) {
        if (res.tapIndex === 0) {
          console.log("0000000000")
          wx.navigateTo({
            url: '../cusService/cusService',
          })
        }
      }
    })
  },

  //动态码添加
  add: function () {
    const self = this;
    wx.showActionSheet({
      itemList: ["手动添加", "扫码添加"],
      itemColor: '#000000',
      success: function (res) {
        if (res.tapIndex === 0) {
          wx.navigateTo({
            url: '../manually/manully',
          })
        } else {
          self.scan()
        }
      }
    })
  },

  //扫二维码
  scan: function () {
    wx.scanCode({
      success: function (res) {
        const totpInfo = util.parseTotpURL(res.result)
        if (null == totpInfo) {
          wx.showModal({
            content: '无效二维码',
            showCancel: false,
            confirmText: '返回',
            confirmColor: '#ff9c10',
          })
        } else {
          console.log("totpInfo--",totpInfo)
          util.addToken(totpInfo, "")
        }
      }
    })
  },

  //从数据库获取动态码
  getDbData: function () {
    self = this;
    const db = wx.cloud.database();
    db.collection('otp').orderBy('createTime', 'desc').limit(1).get({
      success: function (res) {
        if (res && res.data && res.data[0]) {
          const data = res.data[0];
          const token = data.token;
          console.log("collection", token)
          if (data.num > 0) {
            const text = `发现${data.num}条数据，确定使用云端数据覆盖本地记录？`
            wx.showModal({
              title: '云端数据恢复',
              content: text,
              confirmColor: '#ff9c10',
              success(res) {
                if (res.confirm) {
                  console.log("setStorage", token)
                  wx.setStorage({
                    key: 'token',
                    data: token,
                    success: function (res) {
                      wx.showToast({
                        title: '数据恢复成功',
                        icon: 'success',
                        duration: 2000
                      })
                      self.setData({
                        rawList: token,
                        list: util.convertSec(token)
                      })
                    },
                  })

                } else if (res.cancel) { }
              }
            })
          }
          // else {
          //   wx.showToast({
          //     title: '未发现备份数据',
          //     icon: 'none',
          //     duration: 2000
          //   })
          // }
        }
        // else {
        //   wx.showToast({
        //     title: '未发现备份数据',
        //     icon: 'none',
        //     duration: 2000
        //   })
        // }
      }
    })
  },

  //定时更新
  updateData: function () {
    self = this;
    // 在组件实例进入页面节点树时执行
    this.countdownInterval = setInterval(() => {
      let newCount = this.data.countdown - 1;
      if (newCount < 1) {
        newCount = 30; // 重置倒计时
        self.setData({
          secretColor: "#0276f8"
        })
        var updateToken = self.data.rawList.map(item => ({
          ...item,
          secret: TOTP.now(item.secret)
        }))
        self.setData({
          list: updateToken
        })
      }
      if (newCount < 6) {
        self.setData({
          secretColor: "#d93020"
        })
      }
      const newProg = (newCount / 30) * 100;
      this.setData({
        countdown: newCount,
        progress: newProg
      });
    }, 1000);
  }
});