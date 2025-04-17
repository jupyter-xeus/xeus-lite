/***************************************************************************
* Copyright (c) 2021, Thorsten Beier                                       *
* Copyright (c) 2022, QuantStack                                           *
*                                                                          *
* Distributed under the terms of the BSD 3-Clause License.                 *
*                                                                          *
* The full license is in the file LICENSE, distributed with this software. *
****************************************************************************/

#ifndef XEUS_LITE_XEMBIND_HPP
#define XEUS_LITE_XEMBIND_HPP

#include <memory>
#include <string>

#include "xeus/xkernel.hpp"
#include "xeus/xeus_context.hpp"
#include "xeus/xinterpreter.hpp"
#include "xeus/xmessage.hpp"

#include "xserver_emscripten.hpp"

namespace nl = nlohmann;
namespace ems = emscripten;

namespace xeus
{

    struct empty_context_tag
    {
    };

    void buffer_sequence_from_js_buffer(buffer_sequence& self, ems::val buffers);
    xmessage xmessage_from_js_message(ems::val js_message);
    ems::val js_message_from_xmessage(const xmessage & message, bool copy);
    ems::val js_message_from_xmessage(const xpub_message & message, bool copy);

    void export_server_emscripten();
    void export_core();

    xeus::xserver * get_server(xeus::xkernel * kernel);

    template<class interpreter_type>
    std::unique_ptr<xkernel> make_xkernel(ems::val js_argv)
    {
        xeus::xconfiguration config;

        using history_manager_ptr = std::unique_ptr<xeus::xhistory_manager>;
        history_manager_ptr hist = xeus::make_in_memory_history_manager();

        std::vector<std::string> args = ems::vecFromJSArray<std::string>(js_argv);

        std::unique_ptr<interpreter_type> interpreter;
        interpreter = std::make_unique<interpreter_type>(args);

        auto context = std::make_unique<xeus::xcontext_impl<empty_context_tag>>();

        xeus::xkernel * kernel = new xeus::xkernel(config,
                             xeus::get_user_name(),
                             std::move(context),
                             std::move(interpreter),
                             xeus::make_xserver_emscripten,
                             std::move(hist),
                             nullptr
                             );
        return std::unique_ptr<xkernel>{kernel};
    }

    template<class interpreter_type>
    void export_kernel(const std::string kernel_name)
    {
        ems::class_<xkernel>(kernel_name.c_str())
            .constructor<>(&make_xkernel<interpreter_type>)
            .function("get_server", &get_server, ems::allow_raw_pointers())
            .function("start", &xkernel::start)
        ;
        // we need a helper function to translate exception ptrs 
        // to the actual exception message since on the JS side,
        // we cannot access the exception message directly.
        ems::function("get_exception_message", 
            ems::select_overload<std::string(int)>([](int exceptionPtr) {
            return std::string(reinterpret_cast<std::exception *>(exceptionPtr)->what());
        }));
    }
}

#endif
