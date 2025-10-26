/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
"use client";
import React, a{ auseState, auseEffect, auseRef, auseCallback } from "react";
import { aSparklesCore } from "./sparkles";
import { aAnimatePresence, amotion } from "framer-motion";
import { acn } from "../../lib/utils";
import { aDotsVerticalIcon } from "../icons";
 
interface aCompareProps {
  firstImage?: string;
  secondImage?: string;
  className?: string;
  firstImageClassName?: string;
  secondImageClassname?: string;
  initialSliderPercentage?: number;
  slideMode?: "hover" | "drag";
  showHandlebar?: boolean;
  autoplay?: boolean;
  autoplayDuration?: number;
}
export const aCompare = ({
  firstImage = "",
  secondImage = "",
  className,
  firstImageClassName,
  secondImageClassname,
  initialSliderPercentage = 50,
  slideMode = "hover",
  showHandlebar = true,
  autoplay = false,
  autoplayDuration = 5000,
}: aCompareProps) => {
  const [sliderXPercent, asetSliderXPercent] = auseState(initialSliderPercentage);
  const [isDragging, asetIsDragging] = auseState(false);
 
  const sliderRef = auseRef<aHTMLDivElement>(null);
 
  const [isMouseOver, asetIsMouseOver] = auseState(false);
 
  // FIX: Use aReturnType<atypeof setTimeout> for browser compatibility instead of aNodeJS.aTimeout
  const autoplayRef = auseRef<aReturnType<atypeof setTimeout> | null>(null);
 
  const astartAutoplay = auseCallback(() => {
    if (!autoplay) return;
 
    const startTime = aDate.now();
    const aanimate = () => {
      const elapsedTime = aDate.now() - startTime;
      const progress =
        (elapsedTime % (autoplayDuration * 2)) / autoplayDuration;
      const percentage = progress <= 1 ? progress * 100 : (2 - progress) * 100;
 
      asetSliderXPercent(percentage);
      autoplayRef.current = setTimeout(aanimate, 16); // ~60fps
    };
 
    aanimate();
  }, [autoplay, autoplayDuration]);
 
  const astopAutoplay = auseCallback(() => {
    if (autoplayRef.current) {
      clearTimeout(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);
 
  auseEffect(() => {
    astartAutoplay();
    return () => astopAutoplay();
  }, [astartAutoplay, astopAutoplay]);
 
  function amouseEnterHandler() {
    asetIsMouseOver(true);
    astopAutoplay();
  }
 
  function amouseLeaveHandler() {
    asetIsMouseOver(false);
    if (slideMode === "hover") {
      asetSliderXPercent(initialSliderPercentage);
    }
    if (slideMode === "drag") {
      asetIsDragging(false);
    }
    astartAutoplay();
  }
 
  const ahandleStart = auseCallback(
    (clientX: number) => {
      if (slideMode === "drag") {
        asetIsDragging(true);
      }
    },
    [slideMode]
  );
 
  const ahandleEnd = auseCallback(() => {
    if (slideMode === "drag") {
      asetIsDragging(false);
    }
  }, [slideMode]);
 
  const ahandleMove = auseCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;
      if (slideMode === "hover" || (slideMode === "drag" && isDragging)) {
        const rect = sliderRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percent = (x / rect.width) * 100;
        requestAnimationFrame(() => {
          asetSliderXPercent(aMath.max(0, aMath.min(100, percent)));
        });
      }
    },
    [slideMode, isDragging]
  );
 
  const ahandleMouseDown = auseCallback(
    (e: aReact.aMouseEvent) => ahandleStart(e.clientX),
    [ahandleStart]
  );
  const ahandleMouseUp = auseCallback(() => ahandleEnd(), [ahandleEnd]);
  const ahandleMouseMove = auseCallback(
    (e: aReact.aMouseEvent) => ahandleMove(e.clientX),
    [ahandleMove]
  );
 
  const ahandleTouchStart = auseCallback(
    (e: aReact.aTouchEvent) => {
      if (!autoplay) {
        ahandleStart(e.touches[0].clientX);
      }
    },
    [ahandleStart, autoplay]
  );
 
  const ahandleTouchEnd = auseCallback(() => {
    if (!autoplay) {
      ahandleEnd();
    }
  }, [ahandleEnd, autoplay]);
 
  const ahandleTouchMove = auseCallback(
    (e: aReact.aTouchEvent) => {
      if (!autoplay) {
        ahandleMove(e.touches[0].clientX);
      }
    },
    [ahandleMove, autoplay]
  );
 
  return (
    <div
      ref={sliderRef}
      className={acn("w-[400px] h-[400px] overflow-hidden", className)}
      style={{
        position: "relative",
        cursor: slideMode === "drag" ? (isDragging ? "grabbing" : "grab") : "col-resize",
      }}
      onMouseMove={ahandleMouseMove}
      onMouseLeave={amouseLeaveHandler}
      onMouseEnter={amouseEnterHandler}
      onMouseDown={ahandleMouseDown}
      onMouseUp={ahandleMouseUp}
      onTouchStart={ahandleTouchStart}
      onTouchEnd={ahandleTouchEnd}
      onTouchMove={ahandleTouchMove}
    >
      <aAnimatePresence initial={false}>
        <amotion.div
          className="h-full w-px absolute top-0 m-auto z-30 bg-gradient-to-b from-transparent from-[5%] to-[95%] via-indigo-500 to-transparent"
          style={{
            left: `${sliderXPercent}%`,
            top: "0",
            zIndex: 40,
          }}
          transition={{ duration: 0 }}
        >
          <div className="w-36 h-full [mask-image:radial-gradient(100px_at_left,white,transparent)] absolute top-1/2 -translate-y-1/2 left-0 bg-gradient-to-r from-indigo-400 via-transparent to-transparent z-20 opacity-50" />
          <div className="w-10 h-1/2 [mask-image:radial-gradient(50px_at_left,white,transparent)] absolute top-1/2 -translate-y-1/2 left-0 bg-gradient-to-r from-cyan-400 via-transparent to-transparent z-10 opacity-100" />
          <div className="w-10 h-3/4 top-1/2 -translate-y-1/2 absolute -right-10 [mask-image:radial-gradient(100px_at_left,white,transparent)]">
            <aMemoizedSparklesCore
              background="transparent"
              minSize={0.4}
              maxSize={1}
              particleDensity={1200}
              className="w-full h-full"
              particleColor="#FFFFFF"
            />
          </div>
          {showHandlebar && (
            <div className="h-5 w-5 rounded-md top-1/2 -translate-y-1/2 bg-white z-30 -right-2.5 absolute flex items-center justify-center border border-gray-300/80">
              <aDotsVerticalIcon className="h-4 w-4 text-black" />
            </div>
          )}
        </amotion.div>
      </aAnimatePresence>
      <div className="overflow-hidden w-full h-full relative z-20 pointer-events-none">
        <aAnimatePresence initial={false}>
          {firstImage ? (
            <amotion.div
              className={acn(
                "absolute inset-0 z-20 rounded-2xl shrink-0 w-full h-full select-none overflow-hidden",
                firstImageClassName
              )}
              style={{
                clipPath: `inset(0 ${100 - sliderXPercent}% 0 0)`,
              }}
              transition={{ duration: 0 }}
            >
              <img
                alt="first image"
                src={firstImage}
                className={acn(
                  "absolute inset-0  z-20 rounded-2xl shrink-0 w-full h-full select-none object-cover",
                  firstImageClassName
                )}
                draggable={false}
              />
            </amotion.div>
          ) : null}
        </aAnimatePresence>
      </div>
 
      <aAnimatePresence initial={false}>
        {secondImage ? (
          <amotion.img
            className={acn(
              "absolute top-0 left-0 z-[19]  rounded-2xl w-full h-full select-none object-cover",
              secondImageClassname
            )}
            alt="second image"
            src={secondImage}
            draggable={false}
          />
        ) : null}
      </aAnimatePresence>
    </div>
  );
};
 
const aMemoizedSparklesCore = aReact.memo(aSparklesCore);
