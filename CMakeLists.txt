cmake_minimum_required(VERSION 3.16)
project(forgeon VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(PkgConfig REQUIRED)
pkg_check_modules(GTK3 REQUIRED gtk+-3.0)
pkg_check_modules(WEBKIT2GTK REQUIRED webkit2gtk-4.1)

add_executable(forgeon
    src/main.cpp
)

target_include_directories(forgeon PRIVATE
    ${GTK3_INCLUDE_DIRS}
    ${WEBKIT2GTK_INCLUDE_DIRS}
)

target_link_libraries(forgeon PRIVATE
    ${GTK3_LIBRARIES}
    ${WEBKIT2GTK_LIBRARIES}
)

target_compile_options(forgeon PRIVATE
    -Wall -Wextra -Wpedantic
    ${GTK3_CFLAGS_OTHER}
    ${WEBKIT2GTK_CFLAGS_OTHER}
)

# Install the binary
install(TARGETS forgeon DESTINATION bin)

# Install web resources alongside the binary
install(FILES index.html script.js style.css DESTINATION share/forgeon)
install(DIRECTORY icons DESTINATION share/forgeon)
