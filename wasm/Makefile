DEPS = quirks.cc
OUT = quirks-core.mjs

build: $(DEPS)
	@mkdir -p out
	@emcc --bind -Oz \
	  -msimd128 \
	  -msse \
	  -s WASM=1 \
		-s BINARYEN_ASYNC_COMPILATION=0 \
		-s SINGLE_FILE=1 \
		$(DEPS) \
		-o out/$(OUT)

copy: build
	@cp out/$(OUT) ../public/js

clean:
	@rm -f out/$(OUT)