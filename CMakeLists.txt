############################################################################
# Copyright (c) 2016, Johan Mabille, Sylvain Corlay, Martin Renou          #
# Copyright (c) 2016, QuantStack                                           #
#                                                                          #
# Distributed under the terms of the BSD 3-Clause License.                 #
#                                                                          #
# The full license is in the file LICENSE, distributed with this software. #
############################################################################

cmake_minimum_required(VERSION 3.8)
project(xeus-lite)

set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake;${CMAKE_MODULE_PATH}")
set(XEUS_LITE_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/include)
set(XEUS_LITE_SOURCE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)
set(XEUS_LITE_TEST_DIR ${CMAKE_CURRENT_SOURCE_DIR}/test)

# Versionning
# ===========

# Project version
file(STRINGS "${XEUS_LITE_INCLUDE_DIR}/xeus-lite/xeus-lite.hpp" xeus_lite_version_defines
     REGEX "#define XEUS_LITE_VERSION_(MAJOR|MINOR|PATCH)")
foreach(ver ${xeus_lite_version_defines})
    if(ver MATCHES "#define XEUS_LITE_VERSION_(MAJOR|MINOR|PATCH) +([^ ]+)$")
        set(XEUS_LITE_VERSION_${CMAKE_MATCH_1} "${CMAKE_MATCH_2}" CACHE INTERNAL "")
    endif()
endforeach()
set(XEUS_LITE_VERSION
    ${XEUS_LITE_VERSION_MAJOR}.${XEUS_LITE_VERSION_MINOR}.${XEUS_LITE_VERSION_PATCH})
message(STATUS "xeus-lite version: v${XEUS_LITE_VERSION}")


# Build options
# =============

# Test options
option(XEUS_LITE_BUILD_TESTS "xeus test suite" OFF)

# Emscripten wasm build configuration
# ==========================

# Tests are run in Node, while production builds in the browser.
if(XEUS_LITE_BUILD_TESTS)
   # this variable is used in the export_core function
   add_compile_definitions(XEUS_LITE_EMSCRIPTEN_WASM_TEST_BUILD)
   set(XEUS_LITE_EMSCRIPTEN_ENVIRONMENT "node")
else()
   set(XEUS_LITE_EMSCRIPTEN_ENVIRONMENT "web,worker")
endif()

# Print build configuration
# ==========================

message(STATUS "XEUS_LITE_BUILD_TESTS:                ${XEUS_LITE_BUILD_TESTS}")  

# Dependencies
# ============

set(nlohmann_json_REQUIRED_VERSION 3.2.0)
set(xtl_REQUIRED_VERSION 0.7)
set(xeus_REQUIRED_VERSION 3.0)

if (NOT TARGET nlohmann_json)
    find_package(nlohmann_json ${nlohmann_json_REQUIRED_VERSION} REQUIRED)
endif ()

if (NOT TARGET xtl)
    find_package(xtl ${xtl_REQUIRED_VERSION} REQUIRED)
endif ()

if (NOT TARGET xeus)
    find_package(xeus ${xeus_REQUIRED_VERSION} REQUIRED)
endif ()

# Source files
# ============

set(XEUS_LITE_HEADERS
    ${XEUS_LITE_INCLUDE_DIR}/xeus-lite/xembind.hpp
    ${XEUS_LITE_INCLUDE_DIR}/xeus-lite/xeus-lite.hpp
    ${XEUS_LITE_INCLUDE_DIR}/xeus-lite/xserver_emscripten.hpp
)

set(XEUS_LITE_SOURCES
    ${XEUS_LITE_SOURCE_DIR}/xembind.cpp
    ${XEUS_LITE_SOURCE_DIR}/xserver_emscripten.cpp
)

# Targets and link
# ================

include(CheckCXXCompilerFlag)

add_library(xeus-lite STATIC ${XEUS_LITE_SOURCES} ${XEUS_LITE_HEADERS})
target_include_directories(
    xeus-lite
    PUBLIC $<BUILD_INTERFACE:${XEUS_LITE_INCLUDE_DIR}>
    $<INSTALL_INTERFACE:include>
)
target_link_libraries(
    xeus-lite
    PUBLIC nlohmann_json::nlohmann_json
    PUBLIC xtl
    PUBLIC xeus-static
)

set_target_properties(
    xeus-lite
    PROPERTIES
    PUBLIC_HEADER "${XEUS_LITE_HEADERS}"
    PREFIX ""
    OUTPUT_NAME "libxeus-lite"
)

target_compile_features(xeus-lite PRIVATE cxx_std_11)
target_compile_definitions(xeus-lite PRIVATE XEUS_LITE_EMSCRIPTEN_WASM_BUILD)

target_compile_options(xeus-lite
    PUBLIC --std=c++17
    PUBLIC -Wno-deprecated
    PUBLIC "SHELL: -s USE_PTHREADS=0"
    PUBLIC "SHELL: -s DISABLE_EXCEPTION_CATCHING=0"
)

target_link_options(xeus-lite
    PUBLIC --bind
    PUBLIC -Wno-unused-command-line-argument
    PUBLIC "SHELL: -s MODULARIZE=1"
    PUBLIC "SHELL: -s EXPORT_NAME=\"createXeusModule\""
    PUBLIC "SHELL: -s EXPORT_ES6=0"
    PUBLIC "SHELL: -s USE_ES6_IMPORT_META=0"
    PUBLIC "SHELL: -s DEMANGLE_SUPPORT=0"
    PUBLIC "SHELL: -s ASSERTIONS=0"
    PUBLIC "SHELL: -s ALLOW_MEMORY_GROWTH=1"
    PUBLIC "SHELL: -s EXIT_RUNTIME=1"
    PUBLIC "SHELL: -s WASM=1"
    PUBLIC "SHELL: -s USE_PTHREADS=0"
    PUBLIC "SHELL: -s DISABLE_EXCEPTION_CATCHING=0"
    PUBLIC "SHELL: -s ENVIRONMENT=${XEUS_LITE_EMSCRIPTEN_ENVIRONMENT}"
)

target_link_options(xeus-lite
    INTERFACE "SHELL: -s ASYNCIFY=1"
    INTERFACE "SHELL: -s 'ASYNCIFY_IMPORTS=[\"get_stdin\"]'"
    INTERFACE "SHELL: -s 'ASYNCIFY_STACK_SIZE=100000'"
)

# Tests
# =====

# We need to control from outside whether we enable testing or not. We cannot
# rely on BUILD_TESTING since it doe snot exist until CTest is included.

include(CTest)

if(XEUS_LITE_BUILD_TESTS)
    set(BUILD_TESTING ON)
    message(STATUS "tests enabled")
else ()
    set(BUILD_TESTING OFF)
    message(STATUS "tests disabled")
endif()

if(BUILD_TESTING)
    add_subdirectory(test)
endif()

# Installation
# ============

include(GNUInstallDirs)
include(CMakePackageConfigHelpers)

set(XEUS_LITE_CMAKECONFIG_INSTALL_DIR
    "${CMAKE_INSTALL_LIBDIR}/cmake/${PROJECT_NAME}" CACHE STRING "install path for xeus-liteConfig.cmake")

install(TARGETS xeus-lite
        EXPORT ${PROJECT_NAME}-targets
        ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
        LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
        RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
        PUBLIC_HEADER DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/xeus)

# Makes the project importable from the build directory
export(EXPORT ${PROJECT_NAME}-targets
       FILE "${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}Targets.cmake")

# Configure 'xeus-liteConfig.cmake' for a build tree
set(XEUS_LITE_CONFIG_CODE "####### Expanded from \@XEUS_LITE_CONFIG_CODE\@ #######\n")
set(XEUS_LITE_CONFIG_CODE "${XEUS_LITE_CONFIG_CODE}set(CMAKE_MODULE_PATH \"${CMAKE_CURRENT_SOURCE_DIR}/cmake;\${CMAKE_MODULE_PATH}\")\n")
set(XEUS_LITE_CONFIG_CODE "${XEUS_LITE_CONFIG_CODE}##################################################")
configure_package_config_file(${PROJECT_NAME}Config.cmake.in
                              "${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}Config.cmake"
                              INSTALL_DESTINATION ${PROJECT_BINARY_DIR})

# Configure 'xeus-liteConfig.cmake' for an install tree
set(XEUS_LITE_CONFIG_CODE "")
configure_package_config_file(${PROJECT_NAME}Config.cmake.in
                              "${CMAKE_CURRENT_BINARY_DIR}/CMakeFiles/${PROJECT_NAME}Config.cmake"
                              INSTALL_DESTINATION ${XEUS_LITE_CMAKECONFIG_INSTALL_DIR})


write_basic_package_version_file(${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}ConfigVersion.cmake
                                 VERSION ${XEUS_LITE_VERSION}
                                 COMPATIBILITY AnyNewerVersion)
install(FILES ${CMAKE_CURRENT_BINARY_DIR}/CMakeFiles/${PROJECT_NAME}Config.cmake
              ${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}ConfigVersion.cmake
              ${CMAKE_CURRENT_SOURCE_DIR}/cmake/FindLibUUID.cmake
              DESTINATION ${XEUS_LITE_CMAKECONFIG_INSTALL_DIR})
install(EXPORT ${PROJECT_NAME}-targets
        FILE ${PROJECT_NAME}Targets.cmake
        DESTINATION ${XEUS_LITE_CMAKECONFIG_INSTALL_DIR})
