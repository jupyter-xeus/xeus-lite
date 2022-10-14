############################################################################
# Copyright (c) 2016, Johan Mabille, Sylvain Corlay, Martin Renou          #
# Copyright (c) 2016, QuantStack                                           #
#                                                                          #
# Distributed under the terms of the BSD 3-Clause License.                 #
#                                                                          #
# The full license is in the file LICENSE, distributed with this software. #
############################################################################

add_executable(emscripten_wasm_test main_emscripten_wasm.cpp xmock_interpreter.cpp)
target_link_libraries(emscripten_wasm_test PRIVATE xeus-lite)
