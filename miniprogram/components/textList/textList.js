const util = require("../../utils/util");

Component({
  properties: {
    list: {
      type: Array,
      value: []
    },
    countdown: 30,
    progress: 0,
    secretColor: "",
  },

  data: {

  },

  methods: {
    del: function (e) {
      wx.showActionSheet({
        itemList: ['删除'],
        success: function (res) {
          console.log("res.tabIndex",res.tapIndex)
          if (res.tapIndex == 0) {
            console.log("--")
            util.removeToken(e.currentTarget.dataset.index)
          }
        }
      })
    }
  }


})