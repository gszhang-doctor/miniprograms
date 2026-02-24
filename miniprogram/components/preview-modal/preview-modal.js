Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: '预览'
    },
    items: {
      type: Array,
      value: []
    }
  },

  methods: {
    onMaskTap() {
      this.triggerEvent('cancel');
    },

    onContainerTap() {
      // 阻止点击内容区域时关闭弹窗
    },

    onClose() {
      this.triggerEvent('cancel');
    },

    onCancel() {
      this.triggerEvent('cancel');
    },

    onConfirm() {
      this.triggerEvent('confirm');
    }
  }
});
