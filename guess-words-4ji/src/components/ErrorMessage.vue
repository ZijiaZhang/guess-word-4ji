<template>
  <v-banner
      single-line
      :color=style
      v-if="!hidden"
      sticky>
    {{ message }}
  </v-banner>
</template>

<script>
export default {
  name: 'ErrorMessage',
  props: ['message', 'hidden', 'type'],
  computed: {
    style: function (){
      if (this.type === 'error') {
        return "red white--text"
      } else if (this.type === 'warn') {
        return "orange white--text"
      } else {
        return "primary white--text"
      }
    }
  }
}
</script>

<style scoped>

</style>