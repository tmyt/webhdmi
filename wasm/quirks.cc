#include <cstdint>
#include <emscripten.h>
#include <xmmintrin.h>

#define BUFFER_SIZE 128

extern "C" void EMSCRIPTEN_KEEPALIVE process(float *in, float *out)
{
  float *out1 = out;
  float *out2 = out + BUFFER_SIZE;
  for (int i = 0; i < BUFFER_SIZE; i += 4)
  {
    __m128 v = _mm_load_ps(in + i);
    __m128 left = _mm_shuffle_ps(v, v, _MM_SHUFFLE(2, 2, 0, 0));
    __m128 right = _mm_shuffle_ps(v, v, _MM_SHUFFLE(3, 3, 1, 1));
    _mm_store_ps(out1 + i, right);
    _mm_store_ps(out2 + i, left);
  }
}

// #include <xmmintrin.h>
// #include <emscripten.h>

// extern "C" int EMSCRIPTEN_KEEPALIVE process(float *in, float *out, int size)
// {
//   float *out1 = out;
//   float *out2 = out + size;
//   for (int i = 0; i < size; i += 4)
//   {
//     __m128 v = _mm_load_ps(in + i);
//     __m128 l = _mm_shuffle_ps(v, v, _MM_SHUFFLE(2, 2, 0, 0));
//     __m128 r = _mm_shuffle_ps(v, v, _MM_SHUFFLE(3, 3, 1, 1));
//     _mm_store_ps(out1 + i, l);
//     _mm_store_ps(out2 + i, r);
//   }
//   return 0;
// }
