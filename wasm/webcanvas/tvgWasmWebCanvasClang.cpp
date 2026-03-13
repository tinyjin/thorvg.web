/*
 * Copyright (c) 2026 the ThorVG project. All rights reserved.

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
 * Pure clang/wasm32 build - no Emscripten runtime dependency.
 * SW renderer only.
 */

#include "tvgCommon.h"
#include "thorvg_capi.h"
#include "tvgWasmDefaultFont.h"
#include <cstdlib>
#include <cstring>

using namespace tvg;

struct TvgCanvasContext
{
    Canvas* canvas = nullptr;
    uint8_t* buffer = nullptr;
    uint32_t width = 0;
    uint32_t height = 0;
    char errorMsg[256] = "None";

    ~TvgCanvasContext()
    {
        if (canvas) delete canvas;
        std::free(buffer);
        Initializer::term();
        retrieveFont();
    }

    bool init(uint32_t w, uint32_t h)
    {
        if (Initializer::init() != Result::Success) {
            setError("Engine init failed");
            return false;
        }

        Text::load("default", requestFont(), DEFAULT_FONT_SIZE, "ttf", false);

        canvas = SwCanvas::gen(EngineOption::SmartRender);
        if (!canvas) {
            setError("Canvas creation failed");
            return false;
        }

        resize(w, h);
        return true;
    }

    bool resize(uint32_t w, uint32_t h)
    {
        if (!canvas) return false;
        if (width == w && height == h) return true;

        canvas->sync();

        std::free(buffer);
        width = w;
        height = h;
        buffer = (uint8_t*)std::malloc(w * h * sizeof(uint32_t));
        static_cast<SwCanvas*>(canvas)->target((uint32_t*)buffer, w, w, h, ColorSpace::ABGR8888S);

        return true;
    }

    void setError(const char* msg)
    {
        std::strncpy(errorMsg, msg, sizeof(errorMsg) - 1);
        errorMsg[sizeof(errorMsg) - 1] = '\0';
    }
};


extern "C" {

__attribute__((export_name("tvg_wcanvas_init")))
int tvg_wcanvas_init()
{
    return 0;
}

__attribute__((export_name("tvg_wcanvas_term")))
void tvg_wcanvas_term()
{
}

__attribute__((export_name("tvg_wcanvas_create")))
TvgCanvasContext* tvg_wcanvas_create(uint32_t w, uint32_t h)
{
    auto* ctx = new TvgCanvasContext();
    if (!ctx->init(w, h)) {
        // keep ctx alive so error() can be called
    }
    return ctx;
}

__attribute__((export_name("tvg_wcanvas_destroy")))
void tvg_wcanvas_destroy(TvgCanvasContext* ctx)
{
    if (ctx) delete ctx;
}

__attribute__((export_name("tvg_wcanvas_resize")))
int tvg_wcanvas_resize(TvgCanvasContext* ctx, uint32_t w, uint32_t h)
{
    if (!ctx) return -1;
    return ctx->resize(w, h) ? 0 : -1;
}

__attribute__((export_name("tvg_wcanvas_render")))
uint8_t* tvg_wcanvas_render(TvgCanvasContext* ctx)
{
    if (!ctx || !ctx->canvas) return nullptr;
    return ctx->buffer;
}

__attribute__((export_name("tvg_wcanvas_render_size")))
uint32_t tvg_wcanvas_render_size(TvgCanvasContext* ctx)
{
    if (!ctx) return 0;
    return ctx->width * ctx->height * 4;
}

__attribute__((export_name("tvg_wcanvas_ptr")))
uintptr_t tvg_wcanvas_ptr(TvgCanvasContext* ctx)
{
    if (!ctx || !ctx->canvas) return 0;
    return reinterpret_cast<uintptr_t>(ctx->canvas);
}

__attribute__((export_name("tvg_wcanvas_error")))
const char* tvg_wcanvas_error(TvgCanvasContext* ctx)
{
    if (!ctx) return "null context";
    return ctx->errorMsg;
}

__attribute__((export_name("tvg_wcanvas_clear")))
int tvg_wcanvas_clear(TvgCanvasContext* ctx)
{
    if (!ctx || !ctx->canvas) return -1;
    ctx->canvas->remove();
    return 0;
}

__attribute__((export_name("tvg_wcanvas_width")))
uint32_t tvg_wcanvas_width(TvgCanvasContext* ctx)
{
    return ctx ? ctx->width : 0;
}

__attribute__((export_name("tvg_wcanvas_height")))
uint32_t tvg_wcanvas_height(TvgCanvasContext* ctx)
{
    return ctx ? ctx->height : 0;
}

} // extern "C"
