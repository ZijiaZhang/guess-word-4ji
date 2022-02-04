<template>
  <v-banner
      single-line
      color="red white--text"
      v-if="!hidden">
    {{ message }}
  </v-banner>
</template>

<script>
export default {
  name: 'ErrorMessage',
  props: ['message', 'hidden']
}
</script>

<style scoped>

</style>