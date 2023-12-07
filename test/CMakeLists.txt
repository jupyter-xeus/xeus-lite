############################################################################
# Copyright (c) 2016, Johan Mabille, Sylvain Corlay, Martin Renou          #
# Copyright (c) 2016, QuantStack                                           #
# Copyright (c) 2023, Thorsten Beier                                       #
#                                                                          #
# Distributed under the terms of the BSD 3-Clause License.                 #
#                                                                          #
# The full license is in the file LICENSE, distributed with this software. #
############################################################################

if(XEUS_LITE_BUILD_NODE_TESTS)
    add_executable(emscripten_wasm_test main_emscripten_wasm.cpp xmock_interpreter.cpp)
    target_link_libraries(emscripten_wasm_test PRIVATE xeus-lite)
    xeus_wasm_compile_options(emscripten_wasm_test)
    xeus_wasm_link_options(emscripten_wasm_test "node")
endif()

if(XEUS_LITE_BUILD_BROWSER_TEST_KERNEL)
include(GNUInstallDirs)

    # Running find_package(PythonInterp) to retrieve the Python version
    # which is not exported by Pybind11's cmake.
    # Cf. https://github.com/pybind/pybind11/issues/2268
    find_package(PythonInterp ${PythonLibsNew_FIND_VERSION} REQUIRED)

    configure_file (
        "${CMAKE_CURRENT_SOURCE_DIR}/kernel.json.in"
        "${CMAKE_CURRENT_SOURCE_DIR}/kernel.json"
    )


    add_executable(xlite main_emscripten_wasm.cpp xmock_interpreter.cpp)
    target_link_libraries(xlite PRIVATE xeus-lite)
    xeus_wasm_compile_options(xlite)
    xeus_wasm_link_options(xlite "web,worker")

    SET(KERNEL_INSTALL_DIR "share/jupyter/kernels/xlite")

    install(FILES   "${CMAKE_CURRENT_SOURCE_DIR}/logo-64x64.png"
                    "${CMAKE_CURRENT_SOURCE_DIR}/logo-32x32.png"
                    "${CMAKE_CURRENT_SOURCE_DIR}/kernel.json"
            DESTINATION ${KERNEL_INSTALL_DIR})

    install(FILES
            "$<TARGET_FILE_DIR:xlite>/xlite.js"
            "$<TARGET_FILE_DIR:xlite>/xlite.wasm"
            DESTINATION ${CMAKE_INSTALL_BINDIR}
    )
endif()
