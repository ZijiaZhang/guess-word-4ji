<template>
  <v-card class="mx-auto" width="80%">
    <v-card-title>{{word.word}}</v-card-title>
    <v-card-subtitle>{{word.mean}}</v-card-subtitle>
    <v-btn v-on:click="() => $router.push('/')">Return To Home</v-btn>
  </v-card>
</template>
<script>
export default {
  name: 'WordView',
  props: {
    word: {}
  }
}
</script>
