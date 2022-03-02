<template>
  <div :class="color + ' py-1 px-1'">
    <span class="" style="font-family: monospace;">{{character}}</span>
  </div>
</template>

<script>

export const STATUS_ALL_CORRECT = 'correct';
export const STATUS_NOT_CORRECT = 'wrong';
export const STATUS_PARTIAL_CORRECT = 'partial';
export const STATUS_UNKNOWN = 'unknown';

export default {
  name: 'GameCharacter',
  props: ['character', 'status', 'compact'],
  computed: {
    color: function () {
      if(this.status === STATUS_ALL_CORRECT){
        return 'green lighten-2'
      }
      if(this.status === STATUS_NOT_CORRECT){
        return 'red lighten-1'
      }
      if(this.status === STATUS_PARTIAL_CORRECT){
        return 'orange lighten-2'
      }
      if(this.status === STATUS_UNKNOWN){
        return 'grey lighten-1'
      }
      return 'grey lighten-1'
    }
  }
}
</script>

<style scoped>

</style>